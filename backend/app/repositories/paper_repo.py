from beanie import PydanticObjectId

from app.models.paper import Paper
from app.models.user import User

from .mistake_repo import MistakeRepository


class PaperRepository:
    """Paper 数据访问层，封装所有 Beanie/MongoDB 操作。"""

    def __init__(self, mistake_repo: MistakeRepository) -> None:
        self._mistake_repo = mistake_repo

    # ── 查询 ──────────────────────────────────────

    async def get_by_id(self, id: str) -> Paper | None:
        """按 ID 获取试卷，自动 fetch owner Link。"""
        try:
            obj_id = PydanticObjectId(id)
        except Exception:
            return None
        paper = await Paper.get(obj_id)
        if paper:
            await paper.fetch_link(Paper.owner)
        return paper

    async def list_by_owner(
        self,
        owner_id: str,
        *,
        subject: str | None = None,
        search: str | None = None,
    ) -> list[Paper]:
        """按所有者查询试卷列表，支持科目/关键词筛选。"""
        query: dict = {"owner.$id": PydanticObjectId(owner_id)}
        if subject:
            query["subject"] = subject
        if search:
            query["title"] = {"$regex": search, "$options": "i"}
        return await Paper.find_many(query).sort(-Paper.updated_at).to_list()

    async def expand_questions(
        self, question_ids: list[PydanticObjectId]
    ) -> list[dict]:
        """展开题目 ID 列表为完整的题目内容，保持顺序。"""
        result: list[dict] = []
        for oid in question_ids:
            entry = await self._mistake_repo.get_by_id(str(oid))
            if entry is None:
                continue
            result.append(entry.to_response())
        return result

    async def validate_question_ids(
        self, raw_ids: list[str], owner_id: str
    ) -> list[PydanticObjectId]:
        """验证错题 ID 列表：格式合法、存在、且属于指定用户。

        Returns:
            合法的 PydanticObjectId 列表（内部类型，API 层不感知细节）。

        Raises:
            ValueError: ID 格式无效、错题不存在、或无权引用。
                message 格式为 "code:detail"，如 "400:无效的错题 ID: xxx"。
        """
        result: list[PydanticObjectId] = []
        for raw_id in raw_ids:
            try:
                oid = PydanticObjectId(raw_id)
            except Exception:
                raise ValueError(f"400:无效的错题 ID: {raw_id}")
            entry = await self._mistake_repo.get_by_id(str(oid))
            if entry is None:
                raise ValueError(f"404:错题不存在: {raw_id}")
            if self._mistake_repo.get_owner_id(entry) != owner_id:
                raise ValueError(f"403:无权引用该错题: {raw_id}")
            result.append(oid)
        return result

    async def add_questions(
        self, paper: Paper, raw_ids: list[str], owner_id: str
    ) -> int:
        """追加题目到试卷尾部（自动去重），返回新增数量。

        Raises:
            ValueError: 同 validate_question_ids。
        """
        new_ids = await self.validate_question_ids(raw_ids, owner_id)
        existing_set = {str(q) for q in paper.questions}
        added = 0
        for qid in new_ids:
            if str(qid) not in existing_set:
                paper.questions.append(qid)
                existing_set.add(str(qid))
                added += 1
        return added

    # ── 写入 ──────────────────────────────────────

    async def create(
        self,
        owner: User,
        title: str,
        description: str,
        subject: str | None,
        question_ids: list[PydanticObjectId],
    ) -> Paper:
        """创建试卷。"""
        paper = Paper(
            owner=owner,
            title=title,
            description=description,
            subject=subject,
            questions=question_ids,
        )
        await paper.insert()
        return paper

    async def save(self, paper: Paper) -> Paper:
        """保存（更新）试卷。"""
        await paper.save()
        return paper

    async def delete(self, paper: Paper) -> None:
        """删除单张试卷。"""
        await paper.delete()

    async def delete_by_owner(self, owner_id: str) -> int:
        """删除某用户的全部试卷，返回删除数量。"""
        result = await Paper.find(
            {"owner.$id": PydanticObjectId(owner_id)}
        ).delete()
        return result.deleted_count if result else 0

    # ── 辅助 ──────────────────────────────────────

    @staticmethod
    def get_owner_id(paper: Paper) -> str:
        """从 Paper 中安全提取 owner ID 字符串。"""
        owner = paper.owner
        if hasattr(owner, "ref"):
            return str(owner.ref.id)
        return str(owner.id)
