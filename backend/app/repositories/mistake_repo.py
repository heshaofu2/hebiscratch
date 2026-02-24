from beanie import PydanticObjectId

from app.models.mistake import MistakeEntry
from app.models.user import User


class MistakeRepository:
    """MistakeEntry 数据访问层，封装所有 Beanie/MongoDB 操作。"""

    # ── 查询 ──────────────────────────────────────

    async def get_by_id(self, id: str) -> MistakeEntry | None:
        """按 ID 获取错题，自动 fetch owner Link。"""
        try:
            obj_id = PydanticObjectId(id)
        except Exception:
            return None
        entry = await MistakeEntry.get(obj_id)
        if entry:
            await entry.fetch_link(MistakeEntry.owner)
        return entry

    async def list_by_owner(
        self,
        owner_id: str,
        *,
        subjects: list[str] | None = None,
        mastered: bool | None = None,
        search: str | None = None,
    ) -> list[MistakeEntry]:
        """按所有者查询错题列表，支持科目/掌握状态/关键词筛选。"""
        query: dict = {"owner.$id": PydanticObjectId(owner_id)}
        if subjects:
            query["subject"] = (
                subjects[0] if len(subjects) == 1 else {"$in": subjects}
            )
        if mastered is not None:
            query["is_mastered"] = mastered
        if search:
            query["question"] = {"$regex": search, "$options": "i"}
        return await MistakeEntry.find_many(query).sort(
            -MistakeEntry.created_at
        ).to_list()

    async def get_subjects(self, owner_id: str) -> list[str]:
        """获取某用户已使用的全部科目（去重 + 排序）。"""
        mistakes = await MistakeEntry.find(
            MistakeEntry.owner.id == PydanticObjectId(owner_id),
        ).to_list()
        return sorted({m.subject for m in mistakes})

    async def get_stats(self, owner_id: str) -> dict:
        """获取错题统计：总数、已掌握、未掌握、各科目数量。"""
        mistakes = await MistakeEntry.find(
            MistakeEntry.owner.id == PydanticObjectId(owner_id),
        ).to_list()
        total = len(mistakes)
        mastered = sum(1 for m in mistakes if m.is_mastered)
        subjects: dict[str, int] = {}
        for m in mistakes:
            subjects[m.subject] = subjects.get(m.subject, 0) + 1
        return {
            "total": total,
            "mastered": mastered,
            "unmastered": total - mastered,
            "subjects": subjects,
        }

    async def get_owned_by_ids(
        self, ids: list[str], owner_id: str
    ) -> list[MistakeEntry]:
        """批量获取属于指定用户的错题，跳过无效 ID 和非本人的条目。"""
        result: list[MistakeEntry] = []
        for raw_id in ids:
            try:
                oid = PydanticObjectId(raw_id)
            except Exception:
                continue
            entry = await MistakeEntry.get(oid)
            if entry is None:
                continue
            if self._extract_owner_id(entry) != owner_id:
                continue
            result.append(entry)
        return result

    async def count_by_source_image(
        self, path: str, exclude_id: str | None = None
    ) -> int:
        """统计引用了指定原图路径的错题数量，可排除某条。"""
        conditions = [MistakeEntry.source_image_path == path]
        if exclude_id:
            try:
                conditions.append(MistakeEntry.id != PydanticObjectId(exclude_id))
            except Exception:
                pass
        return await MistakeEntry.find(*conditions).count()

    # ── 写入 ──────────────────────────────────────

    async def create(self, owner: User, **fields) -> MistakeEntry:
        """创建单条错题。"""
        entry = MistakeEntry(owner=owner, **fields)
        await entry.insert()
        return entry

    async def create_batch(
        self, owner: User, items: list[dict]
    ) -> list[MistakeEntry]:
        """批量创建错题。"""
        result: list[MistakeEntry] = []
        for item in items:
            entry = MistakeEntry(owner=owner, **item)
            await entry.insert()
            result.append(entry)
        return result

    async def save(self, entry: MistakeEntry) -> MistakeEntry:
        """保存（更新）错题。"""
        await entry.save()
        return entry

    async def delete(self, entry: MistakeEntry) -> None:
        """删除单条错题。"""
        await entry.delete()

    async def delete_many(self, entries: list[MistakeEntry]) -> int:
        """批量删除错题，返回实际删除数量。"""
        count = 0
        for entry in entries:
            await entry.delete()
            count += 1
        return count

    async def delete_by_owner(self, owner_id: str) -> int:
        """删除某用户的全部错题，返回删除数量。"""
        result = await MistakeEntry.find(
            {"owner.$id": PydanticObjectId(owner_id)}
        ).delete()
        return result.deleted_count if result else 0

    # ── 辅助 ──────────────────────────────────────

    @staticmethod
    def get_owner_id(entry: MistakeEntry) -> str:
        """从 MistakeEntry 中安全提取 owner ID 字符串。

        owner 可能是已 fetch 的 User 对象，也可能是未 fetch 的 Link 引用。
        """
        return MistakeRepository._extract_owner_id(entry)

    @staticmethod
    def _extract_owner_id(entry: MistakeEntry) -> str:
        owner = entry.owner
        if hasattr(owner, "ref"):
            return str(owner.ref.id)
        return str(owner.id)
