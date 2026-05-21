---
title: Docker_Nginx
date: 2026-05-21T07:33:00.000Z
updated: 2026-05-21T07:33:00.000Z
---


# Nginx 配置


## Docker


### 启动


`plain text 打开 docker 进入 container内部 打开终端 输入 docker pull 进行初始化`


### 下载镜像


```bash
docker终端内部输入

        docker pull nginx:latest
```


## Nginx


### 创建


```bash
本地创建 nginx 文件夹
    文件夹内部创建四个文件夹 分别是 conf  conf.d html logs

    找到你创建文件夹的地址 比如我的是(window系统) D:\nginx  --  地址最好不要中文

    快捷代码  --  Linux   --  地址
        mkdir -p /data/nginx/conf.d
        mkdir -p /data/nginx/html
        mkdir -p /data/nginx/logs
        mkdir -p /data/nginx/conf

    快捷代码  --  window
        mkdir {地址}\conf.d
        mkdir {地址}\html
        mkdir {地址}\logs
        mkdir {地址}\conf
```


### 拷贝nginx容器对应的文件默认配置


```bash
以 D:\nginx 为例  (D盘前面有空格别忘了)

    docker cp nginx:/etc/nginx/nginx.conf D:\nginx\conf
    docker cp nginx:/etc/nginx/conf.d D:\nginx
    docker cp nginx:/usr/share/nginx/html D:\nginx
```


### 停止并删除nginx容器


```bash
docker rm -f nginx
```


### 启动nginx容器


```bash
以 D:\nginx 为例
    docker run  -p 80:80 --name nginx --restart=always  --privileged=true -v D:\nginx\conf\nginx.conf:/etc/nginx/nginx.conf -v D:\nginx\conf.d:/etc/nginx/conf.d -v D:\nginx\html:/usr/share/nginx/html -v D:\nginx\logs:/var/log/nginx -d  nginx
```


### 验证


`plain text 打开浏览器 输入地址 localhost  有没有 nginx 的欢迎语  有 则成功 无则失败`


### 替换


`plain text nginx 启动成功 则可以把刚才创建的 html 文件内的文件全部删除 替换成你 打包的 dist内部的所有文件`


### 文件列表展示


`plain text Windows 本地 Nginx 部署结构        │        ▼   D:\nginx  [项目根目录]        │        ├── conf/               [主配置目录]        │    └── nginx.conf      [Nginx 主配置文件]        │        ├── conf.d/             [站点配置目录]        │    └── default.conf   [默认站点/反向代理配置文件]        │        ├── html/               [静态资源目录]        │    ├── static/         [静态文件子目录]        │    ├── favicon.icon     [网站图标]        │    └── index.html      [网站首页入口文件]        │        └── logs/               [日志目录]             ├── access.log      [访问日志]             └── error.log       [错误日志]`


### default.conf 配置示例


```plain text
server {
listen 80;
server_name localhost;


```plain text
location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # 统一处理：所有【带 /api】的请求
    # 效果：把 /api/abc/def 变成 http://xxxxx/abc/def 扔给后端
    location /api/ {
        proxy_pass http://xxxxx/;  # <-- 注意：末尾有斜杠 /
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 统一处理：所有【不带 /api】的后端请求（比如 /login, /manager, /abc）
    # 效果：直接把 /login 或者是 /abc/def 原封不动扔给后端
    # 用正则匹配排除掉前端静态资源和 /api，剩下的全丢给后端
    location ~ ^/(?!api|assets|index\.html|favicon\.ico)(.*)$ {
        proxy_pass http://xxxxx;   # <-- 注意：末尾没有斜杠
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 如果有 WebSocket，单独留着它即可
    location /socket.io {
        proxy_pass http://xxxxxx;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```


```

