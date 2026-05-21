---
title: Echart_package
date: 2026-05-21T07:33:00.000Z
updated: 2026-05-21T07:33:00.000Z
---


# Echart 配置解释文本


```json
{
        "version": 1,
        "themeName": "customed",
        "theme": {
            "backgroundColor": "transparent",
            "color": [
                "#2C811E",
                "#893448",
                "#fac858",
                "#ee6666",
                "#0398D9",
                "#fc8452",
                "#9a60b4",
                "#ea7ccc"
            ],
            "grid": {
                "borderColor": "#aaa9a9"
            },
            "visualMap": {
                "textStyle": {
                    "color": "#f2eded"
                }
            },
            "tooltip": {
                "className": "tooltip-container",
                "backgroundColor": "rgba(50, 149, 204, 0.8)",
                "borderWidth": 0,
                "textStyle": {
                    "color": "#f2eded"
                }
            },
            "toolbox": {
                "iconStyle": {
                    "borderColor": "#f2eded"
                },
                "emphasis": {
                    "borderColor": "#02F2FF",
                    "textFill": "#02F2FF"
                },
                "feature": {
                    "saveAsImage": {},
                    "dataView": {},
                    "restore": {},
                    "magicType": {
                    "type": ["line", "bar"]
                    }
                }
            },
            "axisPointer": {
                "label": {
                    "backgroundColor": "rgba(50, 149, 204, 0.8)"
                }
            },
            "legend": {
                "textStyle": {
                    "color": "#f2eded"
                }
            },
            "categoryAxis": {
                "nameTextStyle": {
                    "color": "#f2eded"
                },
                "axisLine": {
                    "show": true,
                    "lineStyle": {
                        "color": "#aaa9a9"
                    }
                },
                "axisTick": {
                    "show": true,
                    "lineStyle": {
                        "color": "#aaa9a9"
                    }
                },
                "axisLabel": {
                    "show": true,
                    "color": "#f2eded"
                },
                "splitLine": {
                    "show": false,
                    "lineStyle": {
                        "color": [
                            "#727171"
                        ]
                    }
                }
            },
            "valueAxis": {
                "nameTextStyle": {
                    "color": "#f2eded"
                },
                "axisLine": {
                    "show": true,
                    "lineStyle": {
                        "color": "#aaa9a9"
                    }
                },
                "axisTick": {
                    "show": true,
                    "lineStyle": {
                        "color": "#aaa9a9"
                    }
                },
                "axisLabel": {
                    "show": true,
                    "color": "#f2eded"
                },
                "splitLine": {
                    "show": true,
                    "lineStyle": {
                        "color": [
                            "#727171"
                        ],
                        "type": "dashed"
                    }
                }
            },
            "timeAxis": {
                "nameTextStyle": {
                    "color": "#f2eded"
                },
                "axisLine": {
                    "show": true,
                    "lineStyle": {
                    "color": "#aaa9a9"
                    }
                },
                "axisTick": {
                    "show": true,
                    "lineStyle": {
                        "color": "#aaa9a9"
                    }
                },
                "axisLabel": {
                    "show": true,
                    "color": "#f2eded"
                },
                "splitLine": {
                    "show": false,
                    "lineStyle": {
                        "color": [
                            "#727171"
                        ],
                        "type": "dashed"
                    }
                }
            },
            "bar": {
                "label": {
                    "color": "#f2eded"
                }
            },
            "line": {
                "markLine": {
                    "label": {
                    "color": "#f2eded"
                    }
                }
            }
        }
    }
```


## 1.外层基础配置


```json
"version": 1,        // 主题配置版本号（固定写法）
    "themeName": "customed", // 主题名字：customed（自定义主题）
```


## 2. 核心主题样式 theme (下面所有内容都是图表全局默认样式，所有图表都会继承这些样式)


### ① 背景 & 全局颜色


```json
"backgroundColor": "transparent",  // 图表背景：透明（不遮挡页面背景）
    "color": [
    "#2C811E",   // 绿色
    "#893448",   // 暗红色
    "#fac858",   // 黄色
    "#ee6666",   // 红色
    "#0398D9",   // 蓝色
    "#fc8452",   // 橙色
    "#9a60b4",   // 紫色
    "#ea7ccc"    // 粉色
    ]

  作用：
    --  图表里的折线、柱状图、饼图会自动循环使用这 8 个颜色。
```


### ② 网格（图表区域边框）


```json
"grid": {
    "borderColor": "#aaa9a9"  // 网格边框颜色：浅灰色
    }
```


### ③ 视觉映射组件（颜色分段指示器）


```json
"visualMap": {
    "textStyle": {
        "color": "#f2eded"  // 文字颜色：浅白色
    }
    }
```


### ④ 悬浮提示框（鼠标放上去显示的提示）


```json
"tooltip": {
        "className": "tooltip-container",  // CSS 类名（方便自定义样式）
        "backgroundColor": "rgba(50, 149, 204, 0.8)", // 半透明蓝色背景
        "borderWidth": 0,  // 无边框
        "textStyle": {
            "color": "#f2eded" // 文字浅白色
        }
    }
```


### ⑤ 工具栏（下载、刷新、视图切换）


```json
"toolbox": {
        "iconStyle": {
            "borderColor": "#f2eded" // 图标边框：浅白
        },
        "emphasis": {
            "borderColor": "#02F2FF", // 鼠标悬浮：亮青色
            "textFill": "#02F2FF"     // 文字颜色：亮青色
        },
        "feature": {
            "saveAsImage": {},    // 保存图片（下载图表）
            "dataView": {},       // 查看数据表格
            "restore": {},        // 重置/刷新图表
            "magicType": {        // 切换图表类型
            "type": ["line", "bar"]
            }
        }
    }
```


### ⑥ 坐标轴指示器（鼠标十字线）


```json
"axisPointer": {
        "label": {
            "backgroundColor": "rgba(50, 149, 204, 0.8)" // 标签背景：半透明蓝
        }
    }
```


### ⑦ 图例（折线 / 柱状图下面的说明）


```json
"legend": {
        "textStyle": {
            "color": "#f2eded" // 文字浅白色
        }
    }
```


### ⑧ 三类坐标轴（核心！） ECharts 有三种轴，这里全部统一配置：


### A. 类目轴（categoryAxis）：文字轴，如周一、周二


```json
"categoryAxis": {
        "nameTextStyle": { "color": "#f2eded" }, // 轴名称颜色
        "axisLine": { // 轴线
            "show": true,
            "lineStyle": { "color": "#aaa9a9" } // 浅灰
        },
        "axisTick": { // 轴刻度
            "show": true,
            "lineStyle": { "color": "#aaa9a9" }
        },
        "axisLabel": { // 轴标签
            "show": true,
            "color": "#f2eded"
        },
        "splitLine": { // 分割线
            "show": false, // 不显示
        }
    }
```


### B. 数值轴（valueAxis）：数字轴


```json
"valueAxis": {
        "nameTextStyle": { "color": "#f2eded" },
        "axisLine": { "show": true, "color": "#aaa9a9" },
        "axisTick": { "show": true, "color": "#aaa9a9" },
        "axisLabel": { "show": true, "color": "#f2eded" },
        "splitLine": {
            "show": true, // 显示虚线分割线
            "lineStyle": {
            "color": "#727171",
            "type": "dashed" // 虚线
            }
        }
    }
```


### C. 时间轴（timeAxis）


```json
"timeAxis": {
        // 样式和类目轴基本一样
        // 分割线关闭
    }
```


### ⑨ 系列样式（图表本身）


### 柱状图（bar）


```json
"bar": {
        "label": {
            "color": "#f2eded" // 柱子上的文字颜色：浅白
        }
    }
```


### 折线图（line）


```json
"line": {
        "markLine": { // 标记线
            "label": {
                "color": "#f2eded"
            }
        }
    }
```

