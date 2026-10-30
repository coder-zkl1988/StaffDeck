"""观测数据保留期清理:agent_events / channel_deliveries / a2a 事件表按天裁剪。

这些表按流式 delta 逐行增长,不清理会无限膨胀拖慢全表扫描路径。
保留期由 settings.observability_retention_days 控制(默认 14 天)。
"""

from __future__ import annotations

import logging
from datetime import timedelta

from sqlmodel import Session, delete

from app.config import get_settings
from app.db.models import A2ATaskEvent, AgentEvent, ChannelDelivery, utc_now

logger = logging.getLogger(__name__)


def cleanup_observability_records(db: Session) -> dict[str, int]:
    """删除超过保留期的观测行,返回各表删除数量。"""
    retention_days = get_settings().observability_retention_days
    if retention_days <= 0:
        return {"agent_events": 0, "channel_deliveries": 0, "a2a_task_events": 0}
    cutoff = utc_now() - timedelta(days=retention_days)
    removed: dict[str, int] = {}
    # channel_deliveries 仅清理已终结的投递,避免误删在途重试
    for name, statement in {
        "agent_events": delete(AgentEvent).where(AgentEvent.created_at < cutoff),
        "channel_deliveries": delete(ChannelDelivery).where(
            ChannelDelivery.created_at < cutoff,
            ChannelDelivery.status.in_(["delivered", "failed"]),
        ),
        "a2a_task_events": delete(A2ATaskEvent).where(A2ATaskEvent.created_at < cutoff),
    }.items():
        result = db.exec(statement)  # type: ignore[arg-type]
        removed[name] = getattr(result, "rowcount", 0) or 0
    db.commit()
    total = sum(removed.values())
    if total:
        logger.info("观测数据保留期清理(>%d 天): %s", retention_days, removed)
    return removed
