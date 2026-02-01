#!/usr/bin/env python3 -u
"""
Scratch 资源下载脚本

从 Scratch 官方服务器下载所有库资源文件（角色、背景、造型、声音）到本地。

使用方法:
    python3 scripts/download-scratch-assets.py
"""

import json
import os
import sys
import subprocess
from pathlib import Path
from typing import Set
from concurrent.futures import ThreadPoolExecutor, as_completed

# 配置
SCRATCH_ASSET_URL = "https://assets.scratch.mit.edu/internalapi/asset/{md5ext}/get/"
LIBRARIES_DIR = Path(__file__).parent.parent / "scratch-gui-build/src/lib/libraries"
OUTPUT_DIR = Path(__file__).parent.parent / "frontend/public/scratch/assets"
MAX_WORKERS = 10  # 并发线程数


def extract_md5ext_from_sprites(data: list) -> Set[str]:
    """从 sprites.json 提取所有 md5ext"""
    md5ext_set = set()
    for sprite in data:
        for costume in sprite.get("costumes", []):
            if md5ext := costume.get("md5ext"):
                md5ext_set.add(md5ext)
        for sound in sprite.get("sounds", []):
            if md5ext := sound.get("md5ext"):
                md5ext_set.add(md5ext)
    return md5ext_set


def extract_md5ext_from_backdrops(data: list) -> Set[str]:
    """从 backdrops.json 提取所有 md5ext"""
    md5ext_set = set()
    for backdrop in data:
        if md5ext := backdrop.get("md5ext"):
            md5ext_set.add(md5ext)
    return md5ext_set


def extract_md5ext_from_costumes(data: list) -> Set[str]:
    """从 costumes.json 提取所有 md5ext"""
    md5ext_set = set()
    for costume in data:
        if md5ext := costume.get("md5ext"):
            md5ext_set.add(md5ext)
    return md5ext_set


def extract_md5ext_from_sounds(data: list) -> Set[str]:
    """从 sounds.json 提取所有 md5ext"""
    md5ext_set = set()
    for sound in data:
        if md5ext := sound.get("md5ext"):
            md5ext_set.add(md5ext)
    return md5ext_set


def collect_all_md5ext() -> Set[str]:
    """收集所有库文件中的 md5ext"""
    all_md5ext = set()

    for filename, extractor in [
        ("sprites.json", extract_md5ext_from_sprites),
        ("backdrops.json", extract_md5ext_from_backdrops),
        ("costumes.json", extract_md5ext_from_costumes),
        ("sounds.json", extract_md5ext_from_sounds),
    ]:
        filepath = LIBRARIES_DIR / filename
        if filepath.exists():
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
                md5ext_set = extractor(data)
                print(f"从 {filename} 提取了 {len(md5ext_set)} 个资源")
                all_md5ext.update(md5ext_set)

    return all_md5ext


def download_asset(md5ext: str) -> tuple:
    """使用 curl 下载单个资源文件，返回 (md5ext, status, error)"""
    output_path = OUTPUT_DIR / md5ext

    # 如果文件已存在且非空，跳过
    if output_path.exists() and output_path.stat().st_size > 0:
        return (md5ext, "skipped", None)

    url = SCRATCH_ASSET_URL.format(md5ext=md5ext)

    try:
        # 使用 curl 下载，它可以正确处理代理
        result = subprocess.run(
            [
                "curl", "-sS", "-f",
                "--max-time", "60",
                "-o", str(output_path),
                url
            ],
            capture_output=True,
            text=True,
            timeout=120
        )

        if result.returncode == 0 and output_path.exists() and output_path.stat().st_size > 0:
            return (md5ext, "downloaded", None)
        else:
            # 清理可能创建的空文件
            if output_path.exists():
                output_path.unlink()
            return (md5ext, "failed", result.stderr or f"curl exit code {result.returncode}")
    except subprocess.TimeoutExpired:
        if output_path.exists():
            output_path.unlink()
        return (md5ext, "failed", "Timeout")
    except Exception as e:
        if output_path.exists():
            output_path.unlink()
        return (md5ext, "failed", str(e))


def download_all_assets(md5ext_set: Set[str]):
    """并发下载所有资源"""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    total = len(md5ext_set)
    downloaded = 0
    skipped = 0
    failed = 0
    failed_list = []

    print(f"\n开始下载 {total} 个资源文件...")
    print(f"输出目录: {OUTPUT_DIR}")
    print(f"并发线程数: {MAX_WORKERS}\n")
    sys.stdout.flush()

    md5ext_list = list(md5ext_set)

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(download_asset, md5ext): md5ext
            for md5ext in md5ext_list
        }

        completed_count = 0
        for future in as_completed(futures):
            md5ext, status, error = future.result()
            completed_count += 1

            if status == "downloaded":
                downloaded += 1
            elif status == "skipped":
                skipped += 1
            else:
                failed += 1
                failed_list.append(f"{md5ext}: {error}")

            # 每 50 个显示一次进度
            if completed_count % 50 == 0 or completed_count == total:
                print(
                    f"进度: {completed_count}/{total} "
                    f"(下载: {downloaded}, 跳过: {skipped}, 失败: {failed})"
                )
                sys.stdout.flush()

    print(f"\n下载完成!")
    print(f"  - 新下载: {downloaded}")
    print(f"  - 已存在跳过: {skipped}")
    print(f"  - 失败: {failed}")

    if failed_list:
        failed_file = OUTPUT_DIR / "failed_downloads.txt"
        with open(failed_file, "w") as f:
            f.write("\n".join(failed_list))
        print(f"  - 失败列表已保存到: {failed_file}")


def main():
    print("=" * 60)
    print("Scratch 资源下载脚本 (使用 curl)")
    print("=" * 60)
    print()

    print("正在扫描库文件...")
    all_md5ext = collect_all_md5ext()
    print(f"\n共发现 {len(all_md5ext)} 个唯一资源文件")
    sys.stdout.flush()

    download_all_assets(all_md5ext)


if __name__ == "__main__":
    main()
