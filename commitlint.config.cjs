/**
 * Commit message convention — Conventional Commits.
 * https://www.conventionalcommits.org/zh-hans/v1.0.0/
 *
 * 格式：<type>(<scope>): <subject>
 *
 * 示例：
 *   feat(backend): add lead submission endpoint
 *   fix(shared): correct lead schema email validation
 *   docs: update ROADMAP for M3
 *   chore(deps): bump zod to 3.24
 *
 * type 选项见下方 type-enum。
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // 新功能
        'fix', // bug 修复
        'docs', // 文档
        'style', // 代码风格（不影响逻辑）
        'refactor', // 重构（既不是新功能也不是 bug）
        'perf', // 性能优化
        'test', // 测试
        'build', // 构建系统 / 外部依赖
        'ci', // CI 配置
        'chore', // 杂项（不修改 src 或测试）
        'revert', // 回滚
      ],
    ],
    'scope-enum': [
      1, // warning, not error
      'always',
      [
        'frontend',
        'backend',
        'shared',
        'docs',
        'docker',
        'ci',
        'deps',
        'release',
        'lint',
        // Workstream scopes (see docs/WORKSTREAMS.md)
        'W1',
        'W2',
        'W3',
        'W4',
        'W5',
      ],
    ],
    'subject-case': [0], // disabled — 允许中英文混排
    'header-max-length': [2, 'always', 100],
  },
}
