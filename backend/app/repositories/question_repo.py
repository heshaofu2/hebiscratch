from beanie import PydanticObjectId

from app.models.question import QuestionEntry
from app.models.user import User


class QuestionRepository:
    """QuestionEntry 数据访问层，封装所有 Beanie/MongoDB 操作。"""

    # ── 查询 ──────────────────────────────────────

    async def get_by_id(self, id: str) -> QuestionEntry | None:
        """按 ID 获取题目，自动 fetch owner Link。"""
        try:
            obj_id = PydanticObjectId(id)
        except Exception:
            return None
        entry = await QuestionEntry.get(obj_id)
        if entry:
            await entry.fetch_link(QuestionEntry.owner)
        return entry

    async def list_by_owner(
        self,
        owner_id: str,
        *,
        subjects: list[str] | None = None,
        mastered: bool | None = None,
        search: str | None = None,
    ) -> list[QuestionEntry]:
        """按所有者查询题目列表，支持科目/掌握状态/关键词筛选。"""
        query: dict = {"owner.$id": PydanticObjectId(owner_id)}
        if subjects:
            query["subject"] = (
                subjects[0] if len(subjects) == 1 else {"$in": subjects}
            )
        if mastered is not None:
            query["is_mastered"] = mastered
        if search:
            query["question"] = {"$regex": search, "$options": "i"}
        return await QuestionEntry.find_many(query).sort(
            -QuestionEntry.created_at
        ).to_list()

    async def get_subjects(self, owner_id: str) -> list[str]:
        """获取某用户已使用的全部科目（去重 + 排序）。"""
        questions = await QuestionEntry.find(
            QuestionEntry.owner.id == PydanticObjectId(owner_id),
        ).to_list()
        return sorted({q.subject for q in questions})

    async def get_stats(self, owner_id: str) -> dict:
        """获取题目统计：总数、已掌握、未掌握、各科目数量。"""
        questions = await QuestionEntry.find(
            QuestionEntry.owner.id == PydanticObjectId(owner_id),
        ).to_list()
        total = len(questions)
        mastered = sum(1 for q in questions if q.is_mastered)
        subjects: dict[str, int] = {}
        for q in questions:
            subjects[q.subject] = subjects.get(q.subject, 0) + 1
        return {
            "total": total,
            "mastered": mastered,
            "unmastered": total - mastered,
            "subjects": subjects,
        }

    async def get_owned_by_ids(
        self, ids: list[str], owner_id: str
    ) -> list[QuestionEntry]:
        """批量获取属于指定用户的题目，跳过无效 ID 和非本人的条目。"""
        result: list[QuestionEntry] = []
        for raw_id in ids:
            try:
                oid = PydanticObjectId(raw_id)
            except Exception:
                continue
            entry = await QuestionEntry.get(oid)
            if entry is None:
                continue
            if self._extract_owner_id(entry) != owner_id:
                continue
            result.append(entry)
        return result

    async def count_by_source_image(
        self, path: str, exclude_id: str | None = None
    ) -> int:
        """统计引用了指定原图路径的题目数量，可排除某条。"""
        conditions = [QuestionEntry.source_image_path == path]
        if exclude_id:
            try:
                conditions.append(QuestionEntry.id != PydanticObjectId(exclude_id))
            except Exception:
                pass
        return await QuestionEntry.find(*conditions).count()

    # ── 写入 ──────────────────────────────────────

    async def create(self, owner: User, **fields) -> QuestionEntry:
        """创建单条题目。"""
        entry = QuestionEntry(owner=owner, **fields)
        await entry.insert()
        return entry

    async def create_batch(
        self, owner: User, items: list[dict]
    ) -> list[QuestionEntry]:
        """批量创建题目。"""
        result: list[QuestionEntry] = []
        for item in items:
            entry = QuestionEntry(owner=owner, **item)
            await entry.insert()
            result.append(entry)
        return result

    async def save(self, entry: QuestionEntry) -> QuestionEntry:
        """保存（更新）题目。"""
        await entry.save()
        return entry

    async def delete(self, entry: QuestionEntry) -> None:
        """删除单条题目。"""
        await entry.delete()

    async def delete_many(self, entries: list[QuestionEntry]) -> int:
        """批量删除题目，返回实际删除数量。"""
        count = 0
        for entry in entries:
            await entry.delete()
            count += 1
        return count

    async def delete_by_owner(self, owner_id: str) -> int:
        """删除某用户的全部题目，返回删除数量。"""
        result = await QuestionEntry.find(
            {"owner.$id": PydanticObjectId(owner_id)}
        ).delete()
        return result.deleted_count if result else 0

    # ── 辅助 ──────────────────────────────────────

    @staticmethod
    def get_owner_id(entry: QuestionEntry) -> str:
        """从 QuestionEntry 中安全提取 owner ID 字符串。

        owner 可能是已 fetch 的 User 对象，也可能是未 fetch 的 Link 引用。
        """
        return QuestionRepository._extract_owner_id(entry)

    @staticmethod
    def _extract_owner_id(entry: QuestionEntry) -> str:
        owner = entry.owner
        if hasattr(owner, "ref"):
            return str(owner.ref.id)
        return str(owner.id)
