NODE_VERSION ?= 18

.PHONY: help
help: ## 显示帮助信息 / Show help
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {sub("\\\\n",sprintf("\n%22c"," "), $$2);printf "\033[36m%-40s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

.PHONY: setup-hooks
setup-hooks: ## 配置 pre-commit hooks / Setup pre-commit hooks
	@echo "Setting up pre-commit hooks..."
	@if [ ! -d ".git" ]; then \
		echo "⚠️  Not a Git repository, skipping hooks installation"; \
	else \
		git config --local core.hooksPath "./scripts/githooks" ; \
		echo "✅ Git pre-commit hook installed (linked to scripts/githooks)"; \
	fi

# ============================================================================
# 环境设置 / Environment Setup
# ============================================================================

.PHONY: setup
setup: install-deps setup-hooks ## 完整设置 / Full setup

.PHONY: install-deps
install-deps: ## 安装依赖 / Install dependencies
	@echo "📦 Installing dependencies..."
	@npm install
	@echo "✅ Dependencies installed"

.PHONY: clean
clean: ## 清理构建产物 / Clean build artifacts
	@echo "🧹 Cleaning build artifacts..."
	@rm -rf dist
	@rm -rf node_modules/.cache
	@echo "✅ Cleaned"

.PHONY: clean-all
clean-all: clean ## 完全清理 / Full clean including node_modules
	@echo "🧹 Removing node_modules..."
	@rm -rf node_modules
	@echo "✅ Full clean completed"

# ============================================================================
# 格式化 / Formatting
# ============================================================================

.PHONY: fmt
fmt: ## 格式化代码 / Format code
	@echo "🎨 Formatting code..."
	@npm run lint:fix
	@echo "✅ Code formatted"

.PHONY: lint
lint: ## 检查代码风格 / Lint code
	@npm run lint

# ============================================================================
# 代码生成 / Code Generation
# ============================================================================

.PHONY: codegen
codegen: ## 生成代码 / Generate code
	@echo "🔧 Running code generation..."
	@npm run codegen
	@echo "✅ Code generation completed"

# ============================================================================
# 类型检查 / Type Checking
# ============================================================================

.PHONY: typecheck
typecheck: ## 运行 TypeScript 类型检查 / Run TypeScript type check
	@npm run typecheck

# ============================================================================
# 测试和覆盖率 / Testing and Coverage
# ============================================================================

.PHONY: test
test: ## 运行所有测试 / Run all tests
	@npm test

.PHONY: test-no-e2e
test-no-e2e: ## 运行测试（排除 E2E）/ Run tests excluding E2E
	@echo "🧪 Running tests (excluding E2E)..."
	@bun test tests/unittests tests/integration

.PHONY: test-watch
test-watch: ## 以 watch 模式运行测试 / Run tests in watch mode
	@npm run test:watch

.PHONY: coverage
coverage: ## 运行测试并显示覆盖率报告 / Run tests with coverage
	@echo "📊 Running coverage tests..."
	@npm run test:coverage

.PHONY: check-coverage
check-coverage: ## 检查覆盖率阈值 / Check coverage threshold
	@echo "📊 Checking coverage threshold..."
	@npx tsx scripts/check-coverage.ts

# ============================================================================
# 构建 / Build
# ============================================================================

.PHONY: build
build: ## 构建项目 / Build project
	@echo "🔨 Building project..."
	@npm run build
	@echo "✅ Build completed"

.PHONY: build-cjs
build-cjs: ## 构建 CommonJS 版本 / Build CommonJS version
	@npm run build:cjs

.PHONY: build-esm
build-esm: ## 构建 ESM 版本 / Build ESM version
	@npm run build:esm

.PHONY: build-types
build-types: ## 构建类型定义 / Build type definitions
	@npm run build:types

# ============================================================================
# 示例 / Examples
# ============================================================================

.PHONY: example-quick-start
example-quick-start: ## 运行 quick-start 示例 / Run quick-start example
	@npm run example:quick-start

.PHONY: example-agent-runtime
example-agent-runtime: ## 运行 agent-runtime 示例 / Run agent-runtime example
	@npm run example:agent-runtime

.PHONY: example-credential
example-credential: ## 运行 credential 示例 / Run credential example
	@npm run example:credential

.PHONY: example-sandbox
example-sandbox: ## 运行 sandbox 示例 / Run sandbox example
	@npm run example:sandbox

# ============================================================================
# CI/CD
# ============================================================================

.PHONY: ci
ci: lint typecheck test build ## 运行完整的 CI 检查 / Run full CI checks
	@echo "✅ All CI checks passed"

.PHONY: ci-no-e2e
ci-no-e2e: lint typecheck test-no-e2e build ## 运行 CI 检查（排除 E2E 测试）/ Run CI checks excluding E2E tests
	@echo "✅ All CI checks passed (E2E tests excluded)"

.PHONY: prepublish
prepublish: ci ## 发布前检查 / Pre-publish checks
	@echo "✅ Ready to publish"

.PHONY: prepublish-no-e2e
prepublish-no-e2e: ci-no-e2e ## 发布前检查（排除 E2E）/ Pre-publish checks excluding E2E
	@echo "✅ Ready to publish (E2E tests excluded)"

.PHONY: publish
publish: prepublish ## 发布到 npm / Publish to npm
	@echo "📦 Publishing to npm..."
	@npm publish --access public
	@echo "✅ Published"

.PHONY: test-local
test-local: prepublish-no-e2e ## 生成本地测试包（不发布到 npm）/ Generate local test package (does not publish to npm)
	@echo "📦 Generating local test package..."
	@npm pack
	@echo "✅ Local test package generated:"
	@ls -t *.tgz | head -1
	@echo "Install with: npm install $$(ls -t *.tgz | head -1)"

.PHONY: publish-test
publish-test: prepublish-no-e2e ## 发布测试包到 npm（自动生成版本号，使用 tag=test）/ Publish test package to npm (auto-generate version, uses tag=test)
	@echo "📦 Generating test version number..."
	$(eval ORIGINAL_VERSION := $(shell node -p "require('./package.json').version"))
	$(eval VERSION_BASE := $(shell echo $(ORIGINAL_VERSION) | sed 's/-.*//'))  # Remove any existing prerelease suffix
	$(eval COMMIT_HASH := $(shell git log -1 --format=%h 2>/dev/null || echo ""))
	@if [ -n "$(COMMIT_HASH)" ]; then \
		echo "Using git commit hash: $(COMMIT_HASH)"; \
		TEST_VERSION="$(VERSION_BASE)-test.$(COMMIT_HASH)"; \
	else \
		echo "Git commit not available, using timestamp"; \
		TEST_VERSION="$(VERSION_BASE)-test.$$(date +%Y%m%d%H%M%S)"; \
	fi; \
	echo "Test version: $$TEST_VERSION"; \
	npm version $$TEST_VERSION --no-git-tag-version --allow-same-version; \
	echo "📦 Publishing test package to npm (tag: test)..."; \
	npm publish --tag test --access public; \
	echo "🔄 Restoring original version: $(ORIGINAL_VERSION)"; \
	npm version $(ORIGINAL_VERSION) --no-git-tag-version --allow-same-version; \
	echo "✅ Published test package with version: $$TEST_VERSION"

.PHONY: publish-test-dry-run
publish-test-dry-run: prepublish-no-e2e ## 模拟发布测试包（不实际上传，但会生成版本号）/ Dry-run test package publishing (generates version but does not publish)
	@echo "🧪 Dry-run: Generating test version number..."
	$(eval ORIGINAL_VERSION := $(shell node -p "require('./package.json').version"))
	$(eval VERSION_BASE := $(shell echo $(ORIGINAL_VERSION) | sed 's/-.*//'))  # Remove any existing prerelease suffix
	$(eval COMMIT_HASH := $(shell git log -1 --format=%h 2>/dev/null || echo ""))
	@if [ -n "$(COMMIT_HASH)" ]; then \
		echo "Using git commit hash: $(COMMIT_HASH)"; \
		TEST_VERSION="$(VERSION_BASE)-test.$(COMMIT_HASH)"; \
	else \
		echo "Git commit not available, using timestamp"; \
		TEST_VERSION="$(VERSION_BASE)-test.$$(date +%Y%m%d%H%M%S)"; \
	fi; \
	echo "Test version: $$TEST_VERSION"; \
	npm version $$TEST_VERSION --no-git-tag-version --allow-same-version; \
	echo "🧪 Dry-run: Publishing test package to npm (tag: test)..."; \
	npm publish --tag test --access public --dry-run; \
	echo "🔄 Restoring original version: $(ORIGINAL_VERSION)"; \
	npm version $(ORIGINAL_VERSION) --no-git-tag-version --allow-same-version; \
	echo "✅ Dry-run completed with test version: $$TEST_VERSION"
.PHONY: publish-dry-run
publish-dry-run: prepublish ## 模拟发布（不实际发布）/ Dry run publish
	@echo "📦 Dry run publishing..."
	@npm publish --dry-run --access public
	@echo "✅ Dry run completed"
