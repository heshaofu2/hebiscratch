#!/usr/bin/env python3
"""启动脚本"""

import uvicorn

from app.common.core import get_settings

if __name__ == "__main__":
    settings = get_settings()

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
