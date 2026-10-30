import os as _os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_APP_SECRET = "change-me-in-development"


class Settings(BaseSettings):
    app_name: str = "Skill Agent Loop Service"
    database_url: str = "sqlite:///./skill_agent_loop.db"
    app_secret: str = DEFAULT_APP_SECRET
    # production 时默认 APP_SECRET 会直接拒绝启动;development 仅告警。
    app_env: str = "development"
    demo_model_base_url: str = "http://localhost:52010/v1"
    demo_model_name: str = "qwen3.6-27b"
    demo_model_api_key: str = ""
    model_api_timeout_seconds: float = 600.0
    model_thinking_mode: str = ""
    model_thinking_models: str = ""
    tool_timeout_seconds: float = 8.0
    external_task_poll_seconds: float = 2.0
    external_task_callback_base_url: str = ""
    a2a_task_timeout_seconds: float = 600.0
    a2a_poll_interval_seconds: float = 0.5
    codex_a2a_enabled: bool = False
    codex_a2a_command: str = "codex"
    codex_a2a_workspace_root: str = ""
    codex_a2a_timeout_seconds: float = 1800.0
    codex_a2a_token: str = ""
    # 飞书官方 lark-cli 集成（app/lark_cli/）。开启即进入能力清单；应用凭据
    # 与用户登录都在对话中完成（config init / auth login 设备码），无需预置
    # 配置或飞书渠道绑定。
    lark_cli_enabled: bool = True
    # 二进制供给见 lark_cli/provision.py：懒加载（首次调用时装，非启动时），
    # 装到用户数据目录。关掉自动安装则必须自备二进制并指定 binary_path。
    lark_cli_auto_install: bool = True
    lark_cli_binary_path: str = ""
    # Codex A2A 工作区保留天数(启动时清理超期目录);<=0 关闭清理
    codex_a2a_workspace_retention_days: float = 7.0
    tool_base_url: str = "http://localhost:5173"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    general_skill_runtime_python: str = ""
    general_skill_runtime_venv: str = ""
    general_skill_runtime_packages: str = "requests,httpx"
    # Keep runtime dependency installation enabled so published skills can
    # provision their declared baseline libraries on first use. Deployments
    # can still disable it explicitly for locked-down environments.
    general_skill_runtime_auto_install: bool = True
    general_skill_pip_index_url: str = ""
    general_skill_pip_timeout_seconds: int = 180
    general_skill_network_install: bool = True
    channel_secret: str = ""
    staffdeck_role: str = "all"
    wechat_ilink_base_url: str = "https://ilinkai.weixin.qq.com"
    channel_delivery_poll_seconds: float = 1.0
    channel_delivery_max_attempts: int = 8
    public_api_enabled: bool = True
    public_api_key_pepper: str = ""
    public_api_idempotency_ttl_seconds: int = 60 * 60 * 24
    public_api_retention_days: int = 30
    public_api_webhook_timeout_seconds: float = 10.0
    public_api_webhook_max_attempts: int = 6
    # 钉钉 emotion 接口的表情常量与所需权限尚未真机验证，验证通过前默认关闭：
    # 否则常量失效或权限未开时，每条入站消息都会留下一条失败的 reaction 投递。
    channel_dingtalk_reaction_enabled: bool = False
    # 出站富文本渲染开关：开启时飞书走 post 富文本、钉钉走 markdown 消息；
    # 关闭时两者回退为纯 text 消息，用于快速回退。
    channel_rich_render_enabled: bool = True
    # 飞书渠道实时执行步骤卡片开关：开启后飞书对话在执行过程中创建并实时更新
    # 一张独立卡片展示智能体每一步（SOP/工具/知识检索），与正文回复互不影响。
    # 仅影响飞书渠道；关闭时退化为仅发最终回复。
    channel_feishu_trace_enabled: bool = True
    # 飞书 trace 卡片 SOP 紧凑展示开关：开启后匹配 SOP（判断意图/进入流程）之后的
    # 中间步骤不再逐行展示，仅显示"翻书动画 + 正在推进SOP"，等待用户补充信息时
    # 定格为"📖 流程已暂停"，SOP 结束时定格为"✅ 流程已结束"。设为 False 可整体
    # 回滚为逐行展示的旧样式；binding 的 config_json.compact_trace=false 可对单个
    # 绑定回滚。
    channel_feishu_trace_compact_sop: bool = True
    # mock 演示 API(/api/mock/*)挂载开关:生产环境建议关闭。
    mock_api_enabled: bool = True
    # 成员可用「探测/adhoc 发现」路径的 stdio 命令白名单(按可执行文件名匹配)。
    # 保存的 MCP server 由管理员维护,不受此白名单约束。
    mcp_stdio_allowed_commands: str = "npx,uvx,uv,node,python,python3,deno,bun,docker"
    # 工具探测(成员可用路径)的目标 URL 与超时约束:
    # 默认拒绝内网/保留地址(防 SSRF),允许 tool_base_url 自身;
    # 内网工具部署可通过该开关放行。
    tool_probe_allow_private_networks: bool = False
    tool_probe_max_timeout_seconds: float = 30.0
    # 观测表(agent_events/channel_deliveries/a2a_task_events)保留天数;<=0 关闭清理
    observability_retention_days: int = 14

    model_config = SettingsConfigDict(
        env_file=_os.environ.get("ULTRARAG_DOTENV", ".env"),
        env_file_encoding="utf-8", extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env.strip().lower() == "production"

    @property
    def app_secret_is_default(self) -> bool:
        return not self.app_secret or self.app_secret == DEFAULT_APP_SECRET

    @property
    def mcp_stdio_allowed_command_list(self) -> list[str]:
        return [
            item.strip().lower()
            for item in self.mcp_stdio_allowed_commands.split(",")
            if item.strip()
        ]

    @property
    def normalized_tool_base_url(self) -> str:
        return self.tool_base_url.rstrip("/")

    @property
    def general_skill_runtime_package_list(self) -> list[str]:
        return [item.strip() for item in self.general_skill_runtime_packages.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
