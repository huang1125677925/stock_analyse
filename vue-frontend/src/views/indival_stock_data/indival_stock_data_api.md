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
- two_crows（TA-Lib: CDL2CROWS）: 两只乌鸦，连续两根阴线的看跌延续/反转；信号取值：-100=识别到，0=无信号。
- three_inside（TA-Lib: CDL3INSIDE）: 三内部上涨/下跌，孕线组合的延续/反转形态；信号取值：±100，0=无信号。
- three_line_strike（TA-Lib: CDL3LINESTRIKE）: 三线打击，三根同向K线后出现反向强实体；信号取值：±100，0=无信号。
- three_outside（TA-Lib: CDL3OUTSIDE）: 三外部上涨/下跌，孕线的外部扩展；信号取值：±100，0=无信号。
- three_stars_in_south（TA-Lib: CDL3STARSINSOUTH）: 南方三星，低位三根星线形态；信号取值：±100，0=无信号。
- three_white_soldiers（TA-Lib: CDL3WHITESOLDIERS）: 三个白兵，连续三根阳线的看涨延续；信号取值：100=识别到，0=无信号。
- abandoned_baby（TA-Lib: CDLABANDONEDBABY）: 弃婴，跳空的三烛线反转形态；信号取值：±100，0=无信号。
- advance_block（TA-Lib: CDLADVANCEBLOCK）: 大敌当前，多头推进但力度衰减的形态；信号取值：-100=识别到，0=无信号。
- belt_hold（TA-Lib: CDLBELTHOLD）: 捉腰带线，开盘即为实体端的长实体；信号取值：±100，0=无信号。
- breakaway（TA-Lib: CDLBREAKAWAY）: 脱离形态，五根K线的趋势脱离；信号取值：±100，0=无信号。
- closing_marubozu（TA-Lib: CDLCLOSINGMARUBOZU）: 收盘秃线，收盘在极端的秃线；信号取值：±100，0=无信号。
- conceal_baby_swallow（TA-Lib: CDLCONCEALBABYSWALL）: 藏婴吞没，影线与实体组合的吞没；信号取值：-100=识别到，0=无信号。
- counterattack（TA-Lib: CDLCOUNTERATTACK）: 反击线，收盘价相同的对立实体；信号取值：±100，0=无信号。
- doji_star（TA-Lib: CDLDOJISTAR）: 十字星形态，星位的十字线；信号取值：±100，0=无信号。
- dragonfly_doji（TA-Lib: CDLDRAGONFLYDOJI）: 蜻蜓十字，下影线很长的十字；信号取值：100=识别到，0=无信号。
- evening_doji_star（TA-Lib: CDLEVENINGDOJISTAR）: 十字暮星，三烛线看跌反转；信号取值：-100=识别到，0=无信号。
- gap_side_by_side_white（TA-Lib: CDLGAPSIDESIDEWHITE）: 并列阳线，上/下跳空并列阳线；信号取值：±100，0=无信号。
- homing_pigeon（TA-Lib: CDLHOMINGPIGEON）: 家鸽，小实体包裹的看涨组合；信号取值：100=识别到，0=无信号。
- in_neck（TA-Lib: CDLINNECK）: 颈内线，阴线后次日收盘接近前日最低；信号取值：-100=识别到，0=无信号。
- kicking_by_length（TA-Lib: CDLKICKINGBYLENGTH）: 由较长秃线决定的反冲；信号取值：±100，0=无信号。
- ladder_bottom（TA-Lib: CDLLADDERBOTTOM）: 梯底，低位多头反攻形态；信号取值：100=识别到，0=无信号。
- long_line（TA-Lib: CDLLONGLINE）: 长线，极长实体的K线；信号取值：±100，0=无信号。
- marubozu（TA-Lib: CDLMARUBOZU）: 秃线/缺影线，实体无影线；信号取值：±100，0=无信号。
- matching_low（TA-Lib: CDLMATCHINGLOW）: 相同低价，连续两根最低价相同的看涨形态；信号取值：100=识别到，0=无信号。
- mat_hold（TA-Lib: CDLMATHOLD）: 垫脚石，五根K线的看涨延续形态；信号取值：100=识别到，0=无信号。
- morning_doji_star（TA-Lib: CDLMORNINGDOJISTAR）: 十字晨星，三烛线看涨反转；信号取值：100=识别到，0=无信号。
- on_neck（TA-Lib: CDLONNECK）: 颈上线，阴线后次日收盘与前日最低相同；信号取值：-100=识别到，0=无信号。
- rickshaw_man（TA-Lib: CDLRICKSHAWMAN）: 黄包车夫，带长影线的十字；信号取值：100=识别到，0=无信号。
- rise_fall_three_methods（TA-Lib: CDLRISEFALL3METHODS）: 上升/下降三法，中继形态；信号取值：±100，0=无信号。
- separating_lines（TA-Lib: CDLSEPARATINGLINES）: 分离线，趋势延续形态；信号取值：±100，0=无信号。
- shooting_star（TA-Lib: CDLSHOOTINGSTAR）: 射击之星，高位看跌反转；信号取值：-100=识别到，0=无信号。
- short_line（TA-Lib: CDLSHORTLINE）: 短线，极短实体的K线；信号取值：±100，0=无信号。
- spinning_top（TA-Lib: CDLSPINNINGTOP）: 纺锤线，小实体上下影线均较长；信号取值：±100，0=无信号。
- stalled_pattern（TA-Lib: CDLSTALLEDPATTERN）: 停顿形态，上涨趋势中的停顿；信号取值：-100=识别到，0=无信号。
- stick_sandwich（TA-Lib: CDLSTICKSANDWICH）: 条形三明治，三根K线构成的看涨反转；信号取值：100=识别到，0=无信号。
- takuri（TA-Lib: CDLTAKURI）: 探水杆，极长下影线的反转提示；信号取值：100=识别到，0=无信号。
- tasuki_gap（TA-Lib: CDLTASUKIGAP）: 跳空并列线，跳空后的并列线；信号取值：±100，0=无信号。
- thrusting（TA-Lib: CDLTHRUSTING）: 插入形态，下跌中的弱反弹；信号取值：-100=识别到，0=无信号。
- tristar（TA-Lib: CDLTRISTAR）: 三星，三根十字线的反转形态；信号取值：±100，0=无信号。
- unique_three_river（TA-Lib: CDLUNIQUE3RIVER）: 独特三河，低位三烛线形态；信号取值：100=识别到，0=无信号。
- upside_gap_two_crows（TA-Lib: CDLUPSIDEGAP2CROWS）: 向上跳空两只乌鸦，看跌延续/反转；信号取值：-100=识别到，0=无信号。
- xside_gap_three_methods（TA-Lib: CDLXSIDEGAP3METHODS）: 向上/向下跳空三法，中继形态；信号取值：±100，0=无信号。



函数名
形态名称
主要作用与预示
CDL2CROWS
Two Crows (两只乌鸦)
看跌反转。三日模式，第一天长阳，第二、三天连续高开收阴，收盘价降低。
CDL3BLACKCROWS
Three Black Crows (三只乌鸦)
强烈看跌反转。上涨趋势后出现三根连续且收盘价接近最低的阴线，显示空方力量强劲。
CDL3INSIDE
Three Inside Up/Down (三内部上涨/下跌)
趋势反转。以“Inside Up”为例，为“阴阳阳”组合，第二日K线位于第一日实体内部，第三日收盘高于第一日开盘，预示**上涨**。
CDL3LINESTRIKE
Three-Line Strike (三线打击)
看跌持续/反转。四日模式，前三日连续阳线，第四日高开低走，收盘价低于第一日开盘价，可能预示上涨趋势失效。
CDL3OUTSIDE
Three Outside Up/Down (三外部上涨/下跌)
趋势反转。与CDL3INSIDE类似但形态相反。例如“Outside Up”，第一日K线完全位于第二日K线实体内部，预示**上涨**。
CDL3STARSINSOUTH
Three Stars In The South (南方三星)
看涨反转。下跌趋势中，三日皆阴，但实体逐渐缩短且下影线变短，显示卖压减弱，可能止跌回升。
CDL3WHITESOLDIERS
Three Advancing White Soldiers (三个白兵)
强烈看涨反转。下跌底部出现三根连续阳线，每日收盘价接近最高价，开盘价位于前一日实体上半部，显示买盘强劲。
CDLABANDONEDBABY
Abandoned Baby (弃婴)
趋势反转。典型反转信号，第二日出现跳空缺口和十字星，预示原有趋势可能结束。
CDLADVANCEBLOCK
Advance Block (大敌当前/推进板块)
看跌反转。虽为三连阳，但实体逐渐缩短，上影线变长，显示上涨动能衰竭，是潜在顶部信号。
CDLBELTHOLD
Belt-hold (捉腰带线)
趋势反转。在下跌趋势中，出现开盘即是最低价、收盘接近最高价的长阳线，是**看涨**信号。
CDLBREAKAWAY
Breakaway (脱离形态)
趋势反转。五日模式，以看涨为例，在经过一段下跌后出现特定K线组合，预示趋势可能**脱离**下跌转而向上。
CDLCLOSINGMARUBOZU
Closing Marubozu (收盘秃/缺影线)
趋势持续。一日模式，以阳线为例，收盘价等于最高价，无上影线，表明当前趋势（上涨）动力强劲，可能**持续**。
CDLCONCEALBABYSWALL
Concealing Baby Swallow (藏婴吞没)
看涨反转。四日模式，出现在下跌趋势中，尽管前几日走势疲软，但最后一日信号暗示可能**底部反转**。
CDLCOUNTERATTACK
Counterattack (反击线)
趋势反转信号。两日模式，两日K线收盘价处于同一水平，表明多空力量陷入短暂平衡，可能引发趋势反转。
CDLDARKCLOUDCOVER
Dark Cloud Cover (乌云盖顶)
看跌反转。第一日长阳，第二日高开但收盘深入第一日实体内部下半部，显示上方抛压严重。
CDLDOJI
Doji (十字线)
趋势反转指示。开盘价与收盘价基本相同，表明市场犹豫不决。出现于趋势末端时，是重要的反转警示信号。
CDLDOJISTAR
Doji Star (十字星)
趋势反转指示。与十字线类似，但与其前后K线可能有跳空，强化了其作为反转信号的意义。
CDLDRAGONFLYDOJI
Dragonfly Doji (蜻蜓十字)
看涨反转。开盘价与收盘价相同且位于当日高点附近，有长下影线，出现在下跌趋势底部时，预示可能**反弹**。
CDLENGULFING
Engulfing Pattern (吞噬形态)
趋势反转。两日模式，第二日K线实体完全“吞噬”第一日实体。看涨吞噬（阳包阴）预示**上涨**，看跌吞噬（阴包阳）预示**下跌**。
CDLEVENINGDOJISTAR
Evening Doji Star (十字暮星)
强烈看跌反转。暮星变体，第二日为十字星，顶部反转意义更强。
CDLEVENINGSTAR
Evening Star (暮星/黄昏之星)
看跌反转。三日模式，第一日阳线，第二日价格振幅小（星线），第三日阴线深入第一日实体，是经典顶部信号。
CDLGAPSIDESIDEWHITE
Up/Down-gap Side-by-side White Lines (并列阳线)
趋势持续。在上升（或下降）趋势中出现跳空缺口后，并列两根开盘价相近的阳线，预示趋势将**延续**。
CDLGRAVESTONEDOJI
Gravestone Doji (墓碑十字)
看跌反转。开盘价与收盘价相同且位于当日低点附近，有长上影线，无下影线，出现在上涨趋势顶部时是危险信号。
CDLHAMMER
Hammer (锤头线)
看涨反转。实体小，位于顶部，有长下影线（至少实体2倍），无显著上影线，出现在下跌趋势底部，预示可能**回升**。
CDLHANGINGMAN
Hanging Man (上吊线)
看跌反转。形状与锤头线相同，但出现在**上涨趋势的顶部**，预示上涨乏力，可能反转下跌。
CDLHARAMI
Harami Pattern (孕线)
趋势反转。两日模式，第二日小实体完全位于第一日长实体内部，如同“怀孕”，预示当前趋势可能停顿并反转。
CDLHARAMICROSS
Harami Cross Pattern (十字孕线)
趋势反转。孕线的特殊形式，第二日为十字星，其反转意味比普通孕线更强烈。
CDLHIGHWAVE
High-Wave Candle (风高浪大线)
趋势反转。具有极长的上下影线和短实体，表明市场波动剧烈且方向不明，是重要的反转警示信号。
CDLHIKKAKE
Hikkake Pattern (陷阱模式)
趋势持续/失败反转。形态起初类似反转，但后续价格走势失败，最终确认原有趋势将**恢复**。
CDLHIKKAKEMOD
Modified Hikkake Pattern (修正陷阱模式)
趋势持续。陷阱模式的变体，对形态有修正定义，同样预示原有趋势可能**延续**。
CDLHOMINGPIGEON
Homing Pigeon (家鸽)
看涨反转。与孕线类似，两日K线颜色相同，第二日实体完全位于第一日实体内，出现在下跌趋势中预示可能**反弹**。
CDLIDENTICAL3CROWS
Identical Three Crows (三胞胎乌鸦)
强烈看跌反转。与三只乌鸦类似，但三日阴线长度更接近，开盘价等于前一日收盘价，看跌意义更为强烈。
CDLINNECK
In-Neck Pattern (颈内线)
趋势持续（下跌）。下跌趋势中，第二日阳线的收盘价略微高于第一日长阴线的收盘价，但未能深入实体，预示下跌将**继续**。
CDLINVERTEDHAMMER
Inverted Hammer (倒锤头)
看涨反转。位于下跌趋势底部，有长上影线（至少实体2倍），短下影线或无，虽为看涨信号，但需次日阳线确认。
CDLKICKING
Kicking (反冲形态)
趋势反转。由两根颜色相反、存在跳空缺口的秃线（几乎无影线）组成，缺口方向决定趋势反转方向。
CDLKICKINGBYLENGTH
Kicking - bull/bear determined by the longer marubozu (由较长秃线决定的反冲)
趋势反转。反冲形态的变体，由两根K线中较长一根秃线的方向来决定是看涨还是看跌。
CDLLADDERBOTTOM
Ladder Bottom (梯底)
看涨反转。五日模式，出现在下跌趋势中，最后一日阳线确认底部，预示趋势可能**反转向上**。
CDLLONGLEGGEDDOJI
Long Legged Doji (长腿十字)
趋势反转指示。有很长的上下影线，实体极短，表明市场极度犹豫不决和波动，是强烈的反转警示。
CDLLONGLINE
Long Line Candle (长线)
趋势强度指示。实体很长，表明当日价格波动幅度大，显示了当前趋势的强大动力。
CDLMARUBOZU
Marubozu (秃线/缺影线)
趋势持续。几乎没有或完全没有影线，开盘价与收盘价分别接近当日最低与最高（阳线）或最高与最低（阴线），表明趋势动力强劲。
CDLMATCHINGLOW
Matching Low (相同低价)
看涨反转。两日模式，两日K线具有基本相同的最低收盘价，出现在下跌趋势中，可能预示下跌动能减弱。
CDLMATHOLD
Mat Hold (垫脚石)
趋势持续（上涨）。是上升三法模式的变体，在上涨过程中短暂休息后继续**上涨**。
CDLMORNINGDOJISTAR
Morning Doji Star (十字晨星)
强烈看涨反转。晨星变体，第二日为十字星，底部反转意义更强。
CDLMORNINGSTAR
Morning Star (晨星/启明星)
看涨反转。三日模式，与暮星相反，出现在下跌趋势底部，第一日阴线，第二日星线，第三日阳线，是经典底部信号。
CDLONNECK
On-Neck Pattern (颈上线)
趋势持续（下跌）。与颈内线类似，但第二日阳线收盘价仅回升至第一日长阴线的最低点（颈部），预示下跌将**继续**。
CDLPIERCING
Piercing Pattern (刺透形态)
看涨反转。两日模式，第一日长阴，第二日大幅低开但强劲回升，收盘价切入第一日实体内部一半以上。
CDLRICKSHAWMAN
Rickshaw Man (黄包车夫)
趋势反转指示。是特殊的长腿十字，其开盘价与收盘价位于当日价格区间的正中心，是强烈的犹豫信号。
CDLRISEFALL3METHODS
Rising/Falling Three Methods (上升/下降三法)
趋势持续。常见的持续形态。例如上升三法，在上涨趋势中，一根长阳后跟随数日小实体回调，最后再以长阳确认**涨势继续**。
CDLSEPARATINGLINES
Separating Lines (分离线)
趋势持续。两日模式，两日K线颜色相反但具有相同的开盘价，表明趋势将沿原有方向**继续发展**。
CDLSHOOTINGSTAR
Shooting Star (射击之星)
看跌反转。形状与倒锤头相同，但出现在**上涨趋势的顶部**，有长上影线，预示可能见顶回落。
CDLSHORTLINE
Short Line Candle (短线)
趋势动能减弱。实体很短，表明当日价格波动很小，市场犹豫，可能预示当前趋势动能减弱。
CDLSPINNINGTOP
Spinning Top (纺锤线)
趋势犹豫/反转警示。有小实体和较短的影线，表明多空双方力量暂时平衡，是趋势可能变化的早期信号。
CDLSTALLEDPATTERN
Stalled Pattern (停顿形态)
看跌反转。又称“铺垫形态”，出现在上涨趋势末端，通常由三根K线组成，显示上涨动能衰竭，是顶部警告。
CDLSTICKSANDWICH
Stick Sandwich (条形三明治)
看涨反转。三日模式，两边为阴线，中间为阳线，且两根阴线的收盘价处于同一水平，形成“三明治”，预示下跌可能结束。
CDLTAKURI
Takuri (探水杆)
看涨反转。是蜻蜓十字的一种，但其下影线特别长，出现在下跌趋势底部时，是强烈的**反弹**信号。
CDLTASUKIGAP
Tasuki Gap (跳空并列线)
趋势持续。在上升（或下降）趋势中出现跳空后，下一日K线未回补缺口，预示趋势将**延续**。
CDLTHRUSTING
Thrusting Pattern (插入形态)
趋势持续（下跌）。与刺透形态类似，但第二日阳线收盘价未能超过第一日阴线实体的一半，弱势反弹，下跌可能**继续**。
CDLTRISTAR
Tristar Pattern (三星)
趋势反转。由三个十字星组成，是罕见的信号，但一旦出现，通常预示着重要的趋势反转。
CDLUNIQUE3RIVER
Unique 3 River (独特三河)
看涨反转。三日模式，形态组合较为复杂，包括锤子线、低开阳线等，出现在下跌底部，预示可能**反转**。
CDLUPSIDEGAP2CROWS
Upside Gap Two Crows (向上跳空两只乌鸦)
看跌反转。上涨趋势中，第一日长阳后，出现向上跳空的两只乌鸦（两根小阴线），是顶部反转警告。
CDLXSIDEGAP3METHODS
Upside/Downside Gap Three Methods (向上/向下跳空三法)
趋势持续。是跳空并列线模式的扩展，包含更多的K线，但同样预示趋势在经过跳空和整理后将**延续**。

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