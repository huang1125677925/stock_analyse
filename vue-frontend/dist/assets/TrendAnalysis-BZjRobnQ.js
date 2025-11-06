import{T as t}from"./TrendChart-BreLnpGH.js";import{d as u,a as e,c,b as o,e as d,W as x,o as v,_ as p}from"./index-DjdnCFVv.js";import"./index-ElshY9iF.js";/* empty css                                                                   */const g={class:"trend-analysis-page"},f=u({__name:"TrendAnalysis",setup(b){const n=e([{date:"2024-01-01",open:2980.5,high:3020.8,low:2975.2,close:3000.5,volume:15e5,pe_ratio:15.2},{date:"2024-01-02",open:3000.5,high:3035.1,low:2995.8,close:3010.8,volume:16e5,pe_ratio:15.3},{date:"2024-01-03",open:3010.8,high:3025.5,low:2990.2,close:2995.3,volume:14e5,pe_ratio:15.1},{date:"2024-01-04",open:2995.3,high:3040.7,low:2985.1,close:3025.6,volume:17e5,pe_ratio:15.4},{date:"2024-01-05",open:3025.6,high:3055.2,low:3020.8,close:3045.9,volume:18e5,pe_ratio:15.6},{date:"2024-01-08",open:3045.9,high:3060.3,low:3030.5,close:3038.7,volume:165e4,pe_ratio:15.5},{date:"2024-01-09",open:3038.7,high:3070.1,low:3025.4,close:3055.8,volume:175e4,pe_ratio:15.7},{date:"2024-01-10",open:3055.8,high:3080.5,low:3045.2,close:3068.3,volume:19e5,pe_ratio:15.8},{date:"2024-01-11",open:3068.3,high:3085.7,low:3055.1,close:3072.6,volume:185e4,pe_ratio:15.9},{date:"2024-01-12",open:3072.6,high:3095.2,low:3065.8,close:3088.4,volume:2e6,pe_ratio:16}]),l=e([{key:"open",label:"开盘价",color:"#1890ff",yAxisIndex:0},{key:"high",label:"最高价",color:"#52c41a",yAxisIndex:0},{key:"low",label:"最低价",color:"#faad14",yAxisIndex:0},{key:"close",label:"收盘价",color:"#f5222d",yAxisIndex:0},{key:"volume",label:"成交量",color:"#722ed1",yAxisIndex:1},{key:"pe_ratio",label:"PE比率",color:"#13c2c2",yAxisIndex:1}]),i=e([{quarter:"2023-Q1",revenue:12e5,profit:15e4,debt:8e5,assets:5e6},{quarter:"2023-Q2",revenue:135e4,profit:18e4,debt:75e4,assets:52e5},{quarter:"2023-Q3",revenue:145e4,profit:2e5,debt:7e5,assets:54e5},{quarter:"2023-Q4",revenue:16e5,profit:24e4,debt:65e4,assets:56e5},{quarter:"2024-Q1",revenue:175e4,profit:28e4,debt:6e5,assets:58e5},{quarter:"2024-Q2",revenue:19e5,profit:32e4,debt:55e4,assets:6e6},{quarter:"2024-Q3",revenue:205e4,profit:36e4,debt:5e5,assets:62e5}]),s=e([{key:"revenue",label:"营业收入",color:"#1890ff",yAxisIndex:0},{key:"profit",label:"净利润",color:"#52c41a",yAxisIndex:0},{key:"debt",label:"负债总额",color:"#f5222d",yAxisIndex:0},{key:"assets",label:"资产总额",color:"#722ed1",yAxisIndex:1}]),r=e([{date:"2024-01-01",shanghai_index:3000.5,shenzhen_index:1800.2,growth_index:2200.8},{date:"2024-01-02",shanghai_index:3010.8,shenzhen_index:1805.5,growth_index:2210.3},{date:"2024-01-03",shanghai_index:2995.3,shenzhen_index:1795.8,growth_index:2195.7},{date:"2024-01-04",shanghai_index:3025.6,shenzhen_index:1815.2,growth_index:2225.4},{date:"2024-01-05",shanghai_index:3045.9,shenzhen_index:1825.7,growth_index:2240.1},{date:"2024-01-08",shanghai_index:3038.7,shenzhen_index:1820.3,growth_index:2235.6},{date:"2024-01-09",shanghai_index:3055.8,shenzhen_index:1830.9,growth_index:2250.2},{date:"2024-01-10",shanghai_index:3068.3,shenzhen_index:1840.5,growth_index:2265.8}]),h=e([{key:"shanghai_index",label:"上证指数",color:"#1890ff",yAxisIndex:0},{key:"shenzhen_index",label:"深证成指",color:"#52c41a",yAxisIndex:0},{key:"growth_index",label:"创业板指",color:"#f5222d",yAxisIndex:0}]);return(_,a)=>(v(),c("div",g,[a[0]||(a[0]=o("div",{class:"page-header"},[o("h1",null,"趋势分析"),o("p",null,"通用趋势图表组件演示")],-1)),d(t,{title:"股票价格趋势分析",data:n.value,"date-field":"date","y-fields":l.value,"default-selected-fields":["close","volume"],height:"500px"},null,8,["data","y-fields"]),d(t,{title:"财务指标趋势分析",data:i.value,"date-field":"quarter","y-fields":s.value,"default-selected-fields":["revenue","profit"],height:"450px"},null,8,["data","y-fields"]),d(t,{title:"市场指数趋势分析",data:r.value,"date-field":"date","y-fields":h.value,"default-selected-fields":["shanghai_index"],height:"400px"},null,8,["data","y-fields"]),a[1]||(a[1]=x(`<div class="usage-guide" data-v-a17b015e><h2 data-v-a17b015e>组件使用说明</h2><div class="guide-content" data-v-a17b015e><h3 data-v-a17b015e>基本用法</h3><pre data-v-a17b015e><code data-v-a17b015e>&lt;TrendChart
  title=&quot;图表标题&quot;
  :data=&quot;chartData&quot;
  date-field=&quot;date&quot;
  :y-fields=&quot;yFieldsConfig&quot;
  :default-selected-fields=&quot;[&#39;field1&#39;, &#39;field2&#39;]&quot;
  height=&quot;500px&quot;
/&gt;</code></pre><h3 data-v-a17b015e>Props 说明</h3><ul data-v-a17b015e><li data-v-a17b015e><strong data-v-a17b015e>title</strong>: 图表标题</li><li data-v-a17b015e><strong data-v-a17b015e>data</strong>: 数据数组，每个元素包含日期和各种数值字段</li><li data-v-a17b015e><strong data-v-a17b015e>dateField</strong>: 日期字段名，默认为 &#39;date&#39;</li><li data-v-a17b015e><strong data-v-a17b015e>yFields</strong>: Y轴字段配置数组，包含 key、label、color 等</li><li data-v-a17b015e><strong data-v-a17b015e>defaultSelectedFields</strong>: 默认选中的字段</li><li data-v-a17b015e><strong data-v-a17b015e>height</strong>: 图表高度，默认为 &#39;600px&#39;</li></ul><h3 data-v-a17b015e>数据格式示例</h3><pre data-v-a17b015e><code data-v-a17b015e>[
  {
    &quot;date&quot;: &quot;2024-01-01&quot;,
    &quot;close&quot;: 3000.5,
    &quot;volume&quot;: 1500000,
    &quot;pe_ratio&quot;: 15.2
  },
  {
    &quot;date&quot;: &quot;2024-01-02&quot;,
    &quot;close&quot;: 3010.8,
    &quot;volume&quot;: 1600000,
    &quot;pe_ratio&quot;: 15.3
  }
]</code></pre><h3 data-v-a17b015e>Y轴字段配置示例</h3><pre data-v-a17b015e><code data-v-a17b015e>[
  {
    key: &#39;close&#39;,
    label: &#39;收盘价&#39;,
    color: &#39;#1890ff&#39;,
    yAxisIndex: 0
  },
  {
    key: &#39;volume&#39;,
    label: &#39;成交量&#39;,
    color: &#39;#52c41a&#39;,
    yAxisIndex: 1
  }
]</code></pre></div></div>`,1))]))}}),w=p(f,[["__scopeId","data-v-a17b015e"]]);export{w as default};
