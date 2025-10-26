# 个股数据服务接口文档

## 1. 获取股票列表

获取系统中所有股票的基本信息列表，支持分页。

### 请求信息

- **URL**: `/stocks/`
- **方法**: GET
- **接口名称**: `stock_list`

### 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 描述 |
| --- | --- | --- | --- | --- |
| page | int | 否 | 1 | 页码 |
| page_size | int | 否 | 20 | 每页记录数 |

### 响应结果

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 4000,
    "page": 1,
    "page_size": 20,
    "total_pages": 200,
    "data": [
      {
        "code": "600000",
        "name": "浦发银行",
        "industry": "银行",
        "total_shares": 29352080397,
        "circulating_shares": 28103763899,
        "list_date": "1999-11-10",
        "pe_ratio": 5.23,
        "pb_ratio": 0.47,
        "total_market_cap": 1234567890.12,
        "circulating_market_cap": 1200000000.00,
        "created_at": "2023-01-01T12:00:00",
        "updated_at": "2023-01-02T12:00:00"
      }
    ]
  }
}
```

### 错误码

| 错误码 | 描述 |
| --- | --- |
| 400 | 参数格式错误 |
| 404 | 获取股票列表失败 |
| 500 | 服务器内部错误 |

---

## 2. 获取所有股票实时行情

获取所有股票的实时行情数据，支持分页。

### 请求信息

- **URL**: `/stocks/realtime/`
- **方法**: GET
- **接口名称**: `stock_realtime_all`

### 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 描述 |
| --- | --- | --- | --- | --- |
| page | int | 否 | 1 | 页码 |
| page_size | int | 否 | 20 | 每页记录数 |

### 响应结果

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 4000,
    "page": 1,
    "page_size": 20,
    "total_pages": 200,
    "data": [
      {
        "stock_code": "600000",
        "stock_name": "浦发银行",
        "latest_price": 10.25,
        "change_percent": 2.5,
        "change_amount": 0.25,
        "volume": 123456,
        "amount": 1234567.89,
        "amplitude": 3.2,
        "high": 10.35,
        "low": 10.05,
        "open_price": 10.10,
        "close_price": 10.00,
        "turnover_rate": 1.5,
        "timestamp": "2023-01-02T10:30:00"
      }
    ]
  }
}
```

### 错误码

| 错误码 | 描述 |
| --- | --- |
| 400 | 参数格式错误 |
| 404 | 获取股票实时行情失败 |
| 500 | 服务器内部错误 |

---

## 3. 获取单只股票实时行情

获取指定股票代码的实时行情数据。

### 请求信息

- **URL**: `/stocks/<str:stock_code>/realtime/`
- **方法**: GET
- **接口名称**: `stock_realtime`

### 路径参数

| 参数名 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| stock_code | string | 是 | 股票代码，如：600000 |

### 响应结果

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "stock_code": "600000",
    "stock_name": "浦发银行",
    "latest_price": 10.25,
    "change_percent": 2.5,
    "change_amount": 0.25,
    "volume": 123456,
    "amount": 1234567.89,
    "amplitude": 3.2,
    "high": 10.35,
    "low": 10.05,
    "open_price": 10.10,
    "close_price": 10.00,
    "turnover_rate": 1.5,
    "timestamp": "2023-01-02T10:30:00"
  }
}
```

### 错误码

| 错误码 | 描述 |
| --- | --- |
| 400 | 无效的股票代码 |
| 404 | 获取股票实时行情失败 |
| 500 | 服务器内部错误 |

---

## 4. 获取股票历史行情数据

获取指定股票的历史行情数据。

### 请求信息

- **URL**: `/django/api/individual_stock/stocks/<str:stock_code>/history/`
- **方法**: GET
- **接口名称**: `stock_history`

### 路径参数

| 参数名 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| stock_code | string | 是 | 股票代码，如：600000 |

### 查询参数

| 参数名 | 类型 | 必填 | 默认值 | 描述 |
| --- | --- | --- | --- | --- |
| start_date | string | 否 | 30天前 | 开始日期，格式：YYYYMMDD |
| end_date | string | 否 | 今天 | 结束日期，格式：YYYYMMDD |
| adjust | string | 否 | "" | 复权类型，""为不复权，"qfq"为前复权，"hfq"为后复权 |

### 响应结果

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "stock_code": "600000",
      "stock_name": "浦发银行",
      "date": "2023-01-02",
      "open_price": 10.10,
      "close_price": 10.25,
      "high_price": 10.35,
      "low_price": 10.05,
      "change_percent": 2.5,
      "change_amount": 0.25,
      "volume": 123456,
      "amount": 1234567.89,
      "amplitude": 3.2,
      "turnover_rate": 1.5,
      "created_at": "2023-01-02T16:00:00"
    }
  ]
}
```

### 错误码

| 错误码 | 描述 |
| --- | --- |
| 400 | 无效的股票代码或参数格式错误 |
| 404 | 获取股票历史行情数据失败 |
| 500 | 服务器内部错误 |

---

## 5. 获取股票详细信息

获取指定股票的详细基本信息。

### 请求信息

- **URL**: `/stocks/<str:stock_code>/info/`
- **方法**: GET
- **接口名称**: `stock_info`

### 路径参数

| 参数名 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| stock_code | string | 是 | 股票代码，如：600000 |

### 响应结果

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "code": "600000",
    "name": "浦发银行",
    "industry": "银行",
    "total_shares": 29352080397,
    "circulating_shares": 28103763899,
    "list_date": "1999-11-10",
    "pe_ratio": 5.23,
    "pb_ratio": 0.47,
    "total_market_cap": 1234567890.12,
    "circulating_market_cap": 1200000000.00,
    "created_at": "2023-01-01T12:00:00",
    "updated_at": "2023-01-02T12:00:00"
  }
}
```

### 错误码

| 错误码 | 描述 |
| --- | --- |
| 400 | 无效的股票代码 |
| 404 | 获取股票详细信息失败 |
| 500 | 服务器内部错误 |

---

## 6. 手动更新股票数据

手动触发更新股票数据，可以更新指定股票或所有股票的实时行情和历史数据。

### 请求信息

- **URL**: `/stocks/update/`
- **方法**: POST
- **接口名称**: `update_stock_data`

### 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 描述 |
| --- | --- | --- | --- | --- |
| stock_code | string | 否 | null | 股票代码，如果为空则更新所有股票 |
| update_type | string | 否 | "all" | 更新类型，"all"为全部，"realtime"为实时行情，"history"为历史数据 |
| days | int | 否 | 30 | 更新历史数据的天数 |

### 响应结果

```json
{
  "code": 200,
  "message": "股票数据更新成功",
  "data": {
    "result": {
      "realtime": {
        "updated": 3500,
        "created": 500,
        "failed": 0
      },
      "history": {
        "updated_stocks": 4000,
        "updated_history": 120000
      }
    }
  }
}
```

### 错误码

| 错误码 | 描述 |
| --- | --- |
| 400 | 参数格式错误 |
| 500 | 更新股票数据失败 |

---

## 7. 获取业绩快报列表

获取特定报告期的所有股票业绩快报数据，支持分页。

### 请求信息

- **URL**: `/performance-reports/`
- **方法**: GET
- **接口名称**: `performance_report_list`

### 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 描述 |
| --- | --- | --- | --- | --- |
| date | string | 是 | - | 报告期，格式：YYYYMMDD，如20200331 |
| stock_code | string | 否 | - | 股票代码，用于查询特定股票 |
| page | int | 否 | 1 | 页码 |
| page_size | int | 否 | 20 | 每页记录数 |

### 响应结果

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "reports": [
      {
        "stock_code": "600000",
        "stock_name": "浦发银行",
        "report_date": "20200331",
        "earnings_per_share": 0.65,
        "operating_revenue": 50123456789.12,
        "operating_revenue_growth_rate": "10.5%",
        "operating_revenue_quarter_growth": 2.3,
        "net_profit": 12345678901.23,
        "net_profit_growth_rate": "8.7%",
        "net_profit_quarter_growth": 1.5,
        "net_assets_per_share": 12.34,
        "roe": 5.67,
        "operating_cash_flow_per_share": 1.23,
        "gross_profit_margin": 45.67,
        "industry": "银行",
        "announcement_date": "2020-04-15"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 200,
      "total_count": 4000,
      "page_size": 20,
      "has_next": true,
      "has_previous": false
    }
  }
}
```

### 错误码

| 错误码 | 描述 |
| --- | --- |
| 400 | 参数格式错误或页码超出范围 |
| 500 | 获取业绩快报数据失败 |

---

## 8. 获取指定股票的业绩快报数据

获取指定股票的所有业绩快报数据，支持分页。

### 请求信息

- **URL**: `/stocks/<str:stock_code>/performance-reports/`
- **方法**: GET
- **接口名称**: `stock_performance_reports`

### 路径参数

| 参数名 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| stock_code | string | 是 | 股票代码，如：600000 |

### 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 描述 |
| --- | --- | --- | --- | --- |
| page | int | 否 | 1 | 页码 |
| page_size | int | 否 | 20 | 每页记录数 |

### 响应结果

```json
{
  "code": 200,
  "message": "成功获取股票600000的业绩快报数据",
  "data": {
    "stock_code": "600000",
    "reports": [
      {
          "id": 9814,
          "stock_code": "600000",
          "stock_name": "平安银行",
          "report_date": "20250630",
          "earnings_per_share": 1.18,
          "operating_revenue": 69385000000.0,
          "operating_revenue_growth_rate": -10.04,
          "operating_revenue_quarter_growth": 5.84,
          "net_profit": 24870000000.0,
          "net_profit_growth_rate": -3.9,
          "net_profit_quarter_growth": -23.57,
          "net_assets_per_share": 22.679,
          "roe": 5.25,
          "operating_cash_flow_per_share": 9.0014,
          "gross_profit_margin": null,
          "industry": "银行",
          "announcement_date": "2025-08-23",
          "created_at": "2025-10-11 14:33:51",
          "updated_at": "2025-10-11 14:33:51"
      },
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_count": 100,
      "page_size": 20,
      "has_next": true,
      "has_previous": false
    }
  }
}
```

### 错误码

| 错误码 | 描述 |
| --- | --- |
| 400 | 无效的股票代码格式或页码超出范围 |
| 500 | 获取股票业绩快报数据失败 |

---

## 9. 获取资产负债表列表

获取所有股票的资产负债表数据，支持分页和按报告期筛选。

### 请求信息

- **URL**: `/balance-sheets/`
- **方法**: GET
- **接口名称**: `balance_sheet_list`

### 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 描述 |
| --- | --- | --- | --- | --- |
| date | string | 否 | - | 报告期，格式：YYYYMMDD，如20240331 |
| page | int | 否 | 1 | 页码 |
| page_size | int | 否 | 20 | 每页记录数 |

### 响应结果

```json
{
  "code": 200,
  "message": "成功获取资产负债表数据",
  "data": {
    "total": 4000,
    "page": 1,
    "page_size": 20,
    "total_pages": 200,
    "data": [
      {
        "id": 1,  // 记录ID
        "stock_code": "600000",  // 股票代码
        "stock_name": "浦发银行",  // 股票名称
        "report_date": "20240331",  // 报告期，格式：YYYYMMDD
        "monetary_funds": 1234567890.12,  // 货币资金（元）
        "accounts_receivable": 987654321.00,  // 应收账款（元）
        "inventory": 123456789.00,  // 存货（元）
        "total_assets": 9876543210.00,  // 总资产（元）
        "total_assets_growth_rate": 5.67,  // 总资产同比增长率（%）
        "accounts_payable": 456789123.00,  // 应付账款（元）
        "total_liabilities": 8765432109.00,  // 总负债（元）
        "advance_receipts": 234567890.00,  // 预收账款（元）
        "total_liabilities_growth_rate": 4.32,  // 总负债同比增长率（%）
        "debt_to_asset_ratio": 88.75,  // 资产负债率（%）
        "total_equity": 1111111101.00,  // 股东权益合计（元）
        "announcement_date": "2024-04-30",  // 公告日期
        "created_at": "2024-04-30T16:00:00.000000Z",  // 创建时间
        "updated_at": "2024-04-30T16:00:00.000000Z"  // 更新时间
      }
    ]
  }
}
```

### 错误码

| 错误码 | 描述 |
| --- | --- |
| 400 | 参数格式错误或页码超出范围 |
| 500 | 获取资产负债表数据失败 |

---

## 10. 获取指定股票的资产负债表数据

获取指定股票的所有资产负债表数据，支持分页和按报告期筛选。

### 请求信息

- **URL**: `/stocks/<str:stock_code>/balance-sheets/`
- **方法**: GET
- **接口名称**: `stock_balance_sheets`

### 路径参数

| 参数名 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| stock_code | string | 是 | 股票代码，如：600000 |

### 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 描述 |
| --- | --- | --- | --- | --- |
| date | string | 否 | - | 报告期，格式：YYYYMMDD，如20240331 |
| page | int | 否 | 1 | 页码 |
| page_size | int | 否 | 20 | 每页记录数 |

### 响应结果

```json
{
  "code": 200,
  "message": "成功获取资产负债表数据",
  "data": {
    "total": 20,
    "page": 1,
    "page_size": 20,
    "total_pages": 1,
    "data": [
      {
        "id": 1,  // 记录ID
        "stock_code": "600000",  // 股票代码
        "stock_name": "浦发银行",  // 股票名称
        "report_date": "20240331",  // 报告期，格式：YYYYMMDD
        "monetary_funds": 1234567890.12,  // 货币资金（元）
        "accounts_receivable": 987654321.00,  // 应收账款（元）
        "inventory": 123456789.00,  // 存货（元）
        "total_assets": 9876543210.00,  // 总资产（元）
        "total_assets_growth_rate": 5.67,  // 总资产同比增长率（%）
        "accounts_payable": 456789123.00,  // 应付账款（元）
        "total_liabilities": 8765432109.00,  // 总负债（元）
        "advance_receipts": 234567890.00,  // 预收账款（元）
        "total_liabilities_growth_rate": 4.32,  // 总负债同比增长率（%）
        "debt_to_asset_ratio": 88.75,  // 资产负债率（%）
        "total_equity": 1111111101.00,  // 股东权益合计（元）
        "announcement_date": "2024-04-30",  // 公告日期
        "created_at": "2024-04-30T16:00:00.000000Z",  // 创建时间
        "updated_at": "2024-04-30T16:00:00.000000Z"  // 更新时间
      }
    ]
  }
}
```

### 错误码

| 错误码 | 描述 |
| --- | --- |
| 400 | 无效的股票代码格式或页码超出范围 |
| 500 | 获取资产负债表数据失败 |

---

## 11. 获取利润表列表

获取所有股票的利润表数据，支持分页和按报告期筛选。

### 请求信息

- **URL**: `/income-statements/`
- **方法**: GET
- **接口名称**: `income_statement_list`

### 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 描述 |
| --- | --- | --- | --- | --- |
| date | string | 否 | - | 报告期，格式：YYYYMMDD，如20240331 |
| page | int | 否 | 1 | 页码 |
| page_size | int | 否 | 20 | 每页记录数 |

### 响应结果

```json
{
  "code": 200,
  "message": "成功获取利润表数据",
  "data": {
    "total": 4000,
    "page": 1,
    "page_size": 20,
    "total_pages": 200,
    "data": [
      {
        "id": 1,  // 记录ID
        "stock_code": "600000",  // 股票代码
        "stock_name": "浦发银行",  // 股票名称
        "report_date": "20240331",  // 报告期，格式：YYYYMMDD
        "net_profit": 12345678901.23,  // 净利润（元）
        "net_profit_growth_rate": 8.75,  // 净利润同比增长率（%）
        "operating_revenue": 50123456789.12,  // 营业总收入（元）
        "operating_revenue_growth_rate": 10.50,  // 营业总收入同比增长率（%）
        "operating_expenses": 45000000000.00,  // 营业费用（元）
        "sales_expenses": 2000000000.00,  // 销售费用（元）
        "management_expenses": 3000000000.00,  // 管理费用（元）
        "financial_expenses": 1500000000.00,  // 财务费用（元）
        "total_operating_expenses": 51500000000.00,  // 营业总成本（元）
        "operating_profit": 11000000000.00,  // 营业利润（元）
        "total_profit": 12500000000.00,  // 利润总额（元）
        "announcement_date": "2024-04-30",  // 公告日期
        "created_at": "2024-04-30T16:00:00.000000Z",  // 创建时间
        "updated_at": "2024-04-30T16:00:00.000000Z"  // 更新时间
      }
    ]
  }
}
```

### 错误码

| 错误码 | 描述 |
| --- | --- |
| 400 | 参数格式错误或页码超出范围 |
| 500 | 获取利润表数据失败 |

---

## 12. 获取指定股票的利润表数据

获取指定股票的所有利润表数据，支持分页和按报告期筛选。

### 请求信息

- **URL**: `/stocks/<str:stock_code>/income-statements/`
- **方法**: GET
- **接口名称**: `stock_income_statements`

### 路径参数

| 参数名 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| stock_code | string | 是 | 股票代码，如：600000 |

### 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 描述 |
| --- | --- | --- | --- | --- |
| date | string | 否 | - | 报告期，格式：YYYYMMDD，如20240331 |
| page | int | 否 | 1 | 页码 |
| page_size | int | 否 | 20 | 每页记录数 |

### 响应结果

```json
{
  "code": 200,
  "message": "成功获取利润表数据",
  "data": {
    "total": 20,
    "page": 1,
    "page_size": 20,
    "total_pages": 1,
    "data": [
      {
        "id": 1,  // 记录ID
        "stock_code": "600000",  // 股票代码
        "stock_name": "浦发银行",  // 股票名称
        "report_date": "20240331",  // 报告期，格式：YYYYMMDD
        "net_profit": 12345678901.23,  // 净利润（元）
        "net_profit_growth_rate": 8.75,  // 净利润同比增长率（%）
        "operating_revenue": 50123456789.12,  // 营业总收入（元）
        "operating_revenue_growth_rate": 10.50,  // 营业总收入同比增长率（%）
        "operating_expenses": 45000000000.00,  // 营业费用（元）
        "sales_expenses": 2000000000.00,  // 销售费用（元）
        "management_expenses": 3000000000.00,  // 管理费用（元）
        "financial_expenses": 1500000000.00,  // 财务费用（元）
        "total_operating_expenses": 51500000000.00,  // 营业总成本（元）
        "operating_profit": 11000000000.00,  // 营业利润（元）
        "total_profit": 12500000000.00,  // 利润总额（元）
        "announcement_date": "2024-04-30",  // 公告日期
        "created_at": "2024-04-30T16:00:00.000000Z",  // 创建时间
        "updated_at": "2024-04-30T16:00:00.000000Z"  // 更新时间
      }
    ]
  }
}
```

### 错误码

| 错误码 | 描述 |
| --- | --- |
| 400 | 无效的股票代码格式或页码超出范围 |
| 500 | 获取利润表数据失败 |

---

## 13. 获取现金流量表列表

获取所有股票的现金流量表数据，支持分页和按报告期筛选。

### 请求信息

- **URL**: `/cash-flow-statements/`
- **方法**: GET
- **接口名称**: `cash_flow_statement_list`

### 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 描述 |
| --- | --- | --- | --- | --- |
| date | string | 否 | - | 报告期，格式：YYYYMMDD，如20240331 |
| page | int | 否 | 1 | 页码 |
| page_size | int | 否 | 20 | 每页记录数 |

### 响应结果

```json
{
  "code": 200,
  "message": "成功获取现金流量表数据",
  "data": {
    "total": 4000,
    "page": 1,
    "page_size": 20,
    "total_pages": 200,
    "data": [
      {
        "id": 1,  // 记录ID
        "stock_code": "600000",  // 股票代码
        "stock_name": "浦发银行",  // 股票名称
        "report_date": "20240331",  // 报告期，格式：YYYYMMDD
        "net_cash_flow": 5000000000.00,  // 现金及现金等价物净增加额（元）
        "net_cash_flow_growth_rate": 12.50,  // 现金及现金等价物净增加额同比增长率（%）
        "operating_cash_flow": 8000000000.00,  // 经营活动产生的现金流量净额（元）
        "operating_cash_flow_ratio": 160.00,  // 经营活动现金流量净额占比（%）
        "investing_cash_flow": -2000000000.00,  // 投资活动产生的现金流量净额（元）
        "investing_cash_flow_ratio": -40.00,  // 投资活动现金流量净额占比（%）
        "financing_cash_flow": -1000000000.00,  // 筹资活动产生的现金流量净额（元）
        "financing_cash_flow_ratio": -20.00,  // 筹资活动现金流量净额占比（%）
        "announcement_date": "2024-04-30",  // 公告日期
        "created_at": "2024-04-30T16:00:00.000000Z",  // 创建时间
        "updated_at": "2024-04-30T16:00:00.000000Z"  // 更新时间
      }
    ]
  }
}
```

### 错误码

| 错误码 | 描述 |
| --- | --- |
| 400 | 参数格式错误或页码超出范围 |
| 500 | 获取现金流量表数据失败 |

---

## 14. 获取指定股票的现金流量表数据

获取指定股票的所有现金流量表数据，支持分页和按报告期筛选。

### 请求信息

- **URL**: `/stocks/<str:stock_code>/cash-flow-statements/`
- **方法**: GET
- **接口名称**: `stock_cash_flow_statements`

### 路径参数

| 参数名 | 类型 | 必填 | 描述 |
| --- | --- | --- | --- |
| stock_code | string | 是 | 股票代码，如：600000 |

### 请求参数

| 参数名 | 类型 | 必填 | 默认值 | 描述 |
| --- | --- | --- | --- | --- |
| date | string | 否 | - | 报告期，格式：YYYYMMDD，如20240331 |
| page | int | 否 | 1 | 页码 |
| page_size | int | 否 | 20 | 每页记录数 |

### 响应结果

```json
{
  "code": 200,
  "message": "成功获取现金流量表数据",
  "data": {
    "total": 20,
    "page": 1,
    "page_size": 20,
    "total_pages": 1,
    "data": [
      {
        "id": 1,  // 记录ID
        "stock_code": "600000",  // 股票代码
        "stock_name": "浦发银行",  // 股票名称
        "report_date": "20240331",  // 报告期，格式：YYYYMMDD
        "net_cash_flow": 5000000000.00,  // 现金及现金等价物净增加额（元）
        "net_cash_flow_growth_rate": 12.50,  // 现金及现金等价物净增加额同比增长率（%）
        "operating_cash_flow": 8000000000.00,  // 经营活动产生的现金流量净额（元）
        "operating_cash_flow_ratio": 160.00,  // 经营活动现金流量净额占比（%）
        "investing_cash_flow": -2000000000.00,  // 投资活动产生的现金流量净额（元）
        "investing_cash_flow_ratio": -40.00,  // 投资活动现金流量净额占比（%）
        "financing_cash_flow": -1000000000.00,  // 筹资活动产生的现金流量净额（元）
        "financing_cash_flow_ratio": -20.00,  // 筹资活动现金流量净额占比（%）
        "announcement_date": "2024-04-30",  // 公告日期
        "created_at": "2024-04-30T16:00:00.000000Z",  // 创建时间
        "updated_at": "2024-04-30T16:00:00.000000Z"  // 更新时间
      }
    ]
  }
}
```

### 错误码

| 错误码 | 描述 |
| --- | --- |
| 400 | 无效的股票代码格式或页码超出范围 |
| 500 | 获取现金流量表数据失败 |

---

## 个股K线形态识别API

### 分析指定股票的K线形态（TA-Lib）

**接口地址**: `/django/api/strategy/individual-analysis/candlestick/<stock_code>/`

**请求方式**: GET

**请求参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
| ----- | --- | ---- | ----- | ---- |
| stock_code | string | 是 | - | 股票代码，路径参数 |
| start_date | string | 否 | - | 开始日期，格式YYYY-MM-DD |
| end_date | string | 否 | - | 结束日期，格式YYYY-MM-DD |

**响应示例**:

```json
{
  "code": 200,
  "message": "识别K线形态成功",
  "timestamp": "2024-10-26T12:00:00",
  "data": {
    "stock_code": "600519",
    "stock_name": "贵州茅台",
    "total": 3,
    "patterns": [
      {
        "date": "2024-10-23",
        "hammer": 0,
        "morning_star": 100,
        "piercing": 0,
        "kicking": 0,
        "inverted_hammer": 0,
        "engulfing": -100,
        "harami": 0,
        "hanging_man": 0,
        "evening_star": 0,
        "dark_cloud_cover": 0,
        "three_black_crows": -100,
        "identical_three_crows": 0,
        "doji": 0,
        "long_legged_doji": 0,
        "gravestone_doji": 0
      },
      {
        "date": "2024-10-24",
        "hammer": 100,
        "morning_star": 0,
        "piercing": 0,
        "kicking": 0,
        "inverted_hammer": 0,
        "engulfing": 0,
        "harami": 100,
        "hanging_man": 0,
        "evening_star": 0,
        "dark_cloud_cover": 0,
        "three_black_crows": 0,
        "identical_three_crows": 0,
        "doji": 0,
        "long_legged_doji": 0,
        "gravestone_doji": 0
      }
    ]
  }
}
```

**字段含义说明（patterns项）**:
- date: 交易日期，格式 YYYY-MM-DD。
- hammer（TA-Lib: CDLHAMMER）: 锤子线，常见于下跌末期的看涨反转形态；信号取值：100=识别到锤子线，0=无信号。
- morning_star（TA-Lib: CDLMORNINGSTAR）: 早晨之星，三根K线构成的看涨反转形态；信号取值：100=识别到，0=无信号。
- piercing（TA-Lib: CDLPIERCING）: 刺透形态，两根K线构成的看涨反转；信号取值：100=识别到，0=无信号。
- kicking（TA-Lib: CDLKICKING）: 踢击形态，由两根跳空实体K线构成；信号取值：100=看涨踢击，-100=看跌踢击，0=无信号。
- inverted_hammer（TA-Lib: CDLINVERTEDHAMMER）: 倒锤头，常见于下跌末期的看涨反转提示；信号取值：100=识别到，0=无信号。
- engulfing（TA-Lib: CDLENGULFING）: 吞没形态，两根K线构成；信号取值：100=看涨吞没，-100=看跌吞没，0=无信号。
- harami（TA-Lib: CDLHARAMI）: 孕线，两根K线构成；信号取值：100=看涨孕线，-100=看跌孕线，0=无信号。
- hanging_man（TA-Lib: CDLHANGINGMAN）: 上吊线，常见于上涨末期的看跌反转提示；信号取值：-100=识别到，0=无信号。
- evening_star（TA-Lib: CDLEVENINGSTAR）: 黄昏之星，三根K线构成的看跌反转形态；信号取值：-100=识别到，0=无信号。
- dark_cloud_cover（TA-Lib: CDLDARKCLOUDCOVER）: 乌云盖顶，两根K线构成的看跌反转；信号取值：-100=识别到，0=无信号。
- three_black_crows（TA-Lib: CDL3BLACKCROWS）: 三只黑乌鸦，连续三根阴线的看跌延续/反转信号；信号取值：-100=识别到，0=无信号。
- identical_three_crows（TA-Lib: CDLIDENTICAL3CROWS）: 同样三乌鸦，三根近似实体的阴线；信号取值：-100=识别到，0=无信号。
- doji（TA-Lib: CDLDOJI）: 十字星，开收盘几乎相等的中性形态；信号取值：100=识别到，0=无信号。
- long_legged_doji（TA-Lib: CDLLONGLEGGEDDOJI）: 长脚十字星，影线很长、实体极小的十字星；信号取值：100=识别到，0=无信号。
- gravestone_doji（TA-Lib: CDLGRAVESTONEDOJI）: 墓碑十字星，上影线长、下影线短或无的十字星；信号取值：100=识别到，0=无信号。

> 通用说明：TA-Lib CDL 系列的信号取值统一为 +100（看涨）、-100（看跌）、0（无信号）。部分形态仅有正向或负向信号（如 CDLHAMMER 仅有 +100，CDLDARKCLOUDCOVER 仅有 -100）。

**错误响应示例**:

```json
{
  "code": 404,
  "message": "股票代码不存在: 000000",
  "timestamp": "2024-10-26T12:00:00"
}
```

```json
{
  "code": 404,
  "message": "无日频数据",
  "timestamp": "2024-10-26T12:00:00"
}
```

**说明**:
- 识别形态使用 TA-Lib 的 CDL 系列函数，信号值定义：+100 看涨，-100 看跌，0 无信号。
- 仅从数据库获取数据（IndividualStock、IndividualStockDaily），不进行外部数据拉取。
- 输入数据按“日期”升序排列并转换为 numpy 数组后传入 TA-Lib。
- 返回统一使用 success_response/error_response 封装；日期格式为 YYYY-MM-DD。