# tinydb 项目 Windows 11 启动指南

## 📋 前置要求

### 1. 安装 Go（版本 >= 1.18，推荐 1.22+）

1. **下载 Go**
   - 访问：https://golang.google.cn/dl/ 或 https://go.dev/dl/
   - 下载 Windows 安装包（如：go1.22.0.windows-amd64.msi）

2. **安装 Go**
   - 运行安装包，默认安装到 `C:\Program Files\Go`
   - 安装程序会自动配置环境变量

3. **验证安装**
   ```powershell
   go version
   # 应该显示：go version go1.22.x windows/amd64
   ```

4. **配置 Go 代理（可选，但推荐）**
   ```powershell
   go env -w GO111MODULE=on
   go env -w GOPROXY=https://goproxy.cn,direct
   ```

---

### 2. 安装 Node.js（版本 >= 15.0，推荐 18+）

1. **下载 Node.js**
   - 访问：https://nodejs.org/zh-cn/download/
   - 下载 LTS 版本（推荐 18.x 或 20.x）
   - 选择 Windows Installer (.msi)

2. **安装 Node.js**
   - 运行安装包，按默认选项安装
   - 确保勾选 "Add to PATH" 选项

3. **验证安装**
   ```powershell
   node --version
   # 应该显示：v18.x.x 或更高
   
   npm --version
   # 应该显示：9.x.x 或更高
   ```

---

### 3. 安装 pnpm 包管理器

```powershell
npm install -g pnpm
```

**或者使用国内镜像（推荐）**：
```powershell
npm install -g pnpm --registry=http://registry.npmmirror.com
```

验证安装：
```powershell
pnpm --version
```

---

### 4. 安装 Wails CLI

```powershell
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

**如果下载慢，先设置代理**：
```powershell
go env -w GO111MODULE=on
go env -w GOPROXY=https://goproxy.cn,direct
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

验证安装：
```powershell
wails version
```

---

## 🚀 项目启动步骤

### 步骤 1：克隆/进入项目目录

```powershell
cd E:\code\github\tinydb
```

### 步骤 2：安装 Go 依赖

```powershell
go mod download
```

如果下载慢，确保已设置 Go 代理（见前置要求第1步）。

### 步骤 3：安装前端依赖

```powershell
cd frontend
pnpm install
```

**如果 pnpm install 慢，使用国内镜像**：
```powershell
pnpm install --registry https://registry.npmmirror.com
```

### 步骤 4：构建前端（首次运行需要）

```powershell
# 在 frontend 目录下
pnpm run build
```

### 步骤 5：返回项目根目录并启动开发模式

**重要**：`wails dev` 命令必须在项目根目录运行，不能在 `frontend` 目录运行！

```powershell
# 返回项目根目录（如果当前在 frontend 目录）
cd ..

# 或者直接切换到项目根目录
cd E:\github\tinydb

# 启动开发模式
wails dev
```

**注意**：`wails.json` 文件位于项目根目录，Wails 需要在这个目录下运行才能找到配置文件。

---

## 🎯 快速启动命令（一键启动）

在项目根目录创建 `start.ps1` 文件（PowerShell 脚本）：

```powershell
# start.ps1
Write-Host "正在检查环境..." -ForegroundColor Green

# 检查 Go
if (!(Get-Command go -ErrorAction SilentlyContinue)) {
    Write-Host "错误: 未找到 Go，请先安装 Go >= 1.18" -ForegroundColor Red
    exit 1
}

# 检查 Node.js
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "错误: 未找到 Node.js，请先安装 Node.js >= 15.0" -ForegroundColor Red
    exit 1
}

# 检查 pnpm
if (!(Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "正在安装 pnpm..." -ForegroundColor Yellow
    npm install -g pnpm --registry=http://registry.npmmirror.com
}

# 检查 Wails
if (!(Get-Command wails -ErrorAction SilentlyContinue)) {
    Write-Host "正在安装 Wails..." -ForegroundColor Yellow
    go env -w GO111MODULE=on
    go env -w GOPROXY=https://goproxy.cn,direct
    go install github.com/wailsapp/wails/v2/cmd/wails@latest
}

# 安装 Go 依赖
Write-Host "正在安装 Go 依赖..." -ForegroundColor Green
go mod download

# 安装前端依赖
Write-Host "正在安装前端依赖..." -ForegroundColor Green
Set-Location frontend
if (!(Test-Path "node_modules")) {
    pnpm install --registry https://registry.npmmirror.com
}

# 构建前端（如果需要）
if (!(Test-Path "dist")) {
    Write-Host "正在构建前端..." -ForegroundColor Green
    pnpm run build
}

# 返回根目录并启动
Set-Location ..
Write-Host "正在启动开发服务器..." -ForegroundColor Green
wails dev
```

**使用方法**：
```powershell
# 在项目根目录执行
.\start.ps1
```

---

## 🔧 常见问题解决

### 问题 1：`wails: command not found`

**解决方案**：
1. 确保 Go 已正确安装
2. 检查 `%USERPROFILE%\go\bin` 是否在 PATH 环境变量中
3. 如果不在，添加到 PATH：
   ```powershell
   # 临时添加（当前会话有效）
   $env:Path += ";$env:USERPROFILE\go\bin"
   
   # 永久添加（需要管理员权限）
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";$env:USERPROFILE\go\bin", "User")
   ```

### 问题 2：前端依赖安装失败

**可能原因**：
1. 网络问题
2. husky install 失败（Windows 上常见）

**解决方案**：
```powershell
cd frontend
# 清除缓存
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force pnpm-lock.yaml -ErrorAction SilentlyContinue

# 使用国内镜像重新安装
pnpm install --registry https://registry.npmmirror.com
```

**如果遇到 husky install 错误**：
- 项目已配置为在 husky install 失败时继续安装，不会中断整个安装过程
- 如果仍然失败，可以跳过脚本执行：
  ```powershell
  npm install --ignore-scripts
  ```
  然后手动安装其他依赖（如果需要）

### 问题 3：Go 依赖下载慢

**解决方案**：
```powershell
go env -w GO111MODULE=on
go env -w GOPROXY=https://goproxy.cn,direct
go mod download
```

### 问题 4：`wails dev` 启动失败

**错误信息**：`open E:\github\tinydb\frontend\wails.json: The system cannot find the file specified.`

**原因**：在 `frontend` 目录下运行了 `wails dev`，但 `wails.json` 文件在项目根目录。

**解决方案**：
```powershell
# 返回到项目根目录
cd E:\github\tinydb

# 然后运行
wails dev
```

**其他可能原因**：
1. 前端未构建：先运行 `cd frontend && pnpm run build`
2. 端口被占用：检查 3100 端口是否被占用
3. Wails 版本不匹配：运行 `wails update`

**解决方案**：
```powershell
# 更新 Wails
wails update

# 清理并重新构建
cd frontend
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
pnpm run build
cd ..
wails dev
```

### 问题 5：Windows 11 执行策略限制

如果 PowerShell 脚本无法执行，运行：
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 📝 开发模式说明

运行 `wails dev` 后：

1. **前端开发服务器**：自动启动在 `http://localhost:3100`
2. **热重载**：修改前端代码会自动刷新
3. **Go 后端**：修改 Go 代码需要重启 `wails dev`

### 开发模式下的文件监听

- **前端文件**：`frontend/src/` 下的文件修改会自动热重载
- **Go 文件**：`app/` 下的文件修改需要手动重启

---

## 🎨 其他有用的命令

### 仅启动前端开发服务器

```powershell
cd frontend
pnpm run dev
```

### 构建生产版本

```powershell
# 构建前端
cd frontend
pnpm run build

# 返回根目录构建应用
cd ..
wails build
```

### 清理缓存

```powershell
# 清理前端缓存
cd frontend
pnpm clean:cache

# 清理 Go 模块缓存
go clean -modcache
```

---

## 📚 参考资源

- **Wails 官方文档**：https://wails.io/docs/
- **Go 官方文档**：https://golang.google.cn/doc/
- **Node.js 官方文档**：https://nodejs.org/zh-cn/docs/
- **pnpm 文档**：https://pnpm.io/zh/

---

## ✅ 验证清单

启动前请确认：

- [ ] Go >= 1.18 已安装并配置
- [ ] Node.js >= 15.0 已安装并配置
- [ ] pnpm 已全局安装
- [ ] Wails CLI 已安装
- [ ] Go 依赖已下载（`go mod download`）
- [ ] 前端依赖已安装（`cd frontend && pnpm install`）
- [ ] 前端已构建（`cd frontend && pnpm run build`）

完成以上步骤后，运行 `wails dev` 即可启动项目！

---

