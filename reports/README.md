# 行情日报归档

由 GitHub Actions（`daily-report.yml`）或本地 `npm run report:daily` 生成。

- `YXStock_行情日报_YYYY-MM-DD.md`：Markdown 全文
- `YXStock_行情日报_YYYY-MM-DD.html`：HTML 全文（IM 推送链接指向此文件）

本地测试生成不会自动提交；Actions 在推送 IM 前会将当日文件 commit 到本目录，供 HTML 预览链接使用。
