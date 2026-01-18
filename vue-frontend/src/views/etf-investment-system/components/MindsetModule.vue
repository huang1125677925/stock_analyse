<template>
  <el-card class="mindset-module">
    <template #header>
      <div class="card-header">
        <span>心态校正 (Mindset Coach)</span>
      </div>
    </template>

    <div class="quote-container">
      <el-carousel height="100px" direction="vertical" :autoplay="true" indicator-position="none">
        <el-carousel-item v-for="item in quotes" :key="item">
          <h3 class="quote-text">"{{ item }}"</h3>
        </el-carousel-item>
      </el-carousel>
    </div>

    <div class="checklist">
      <h4>本月纪律检查</h4>
      <el-checkbox v-model="check1" label="是否做到了“跌了兴奋，越跌越买”？" />
      <el-checkbox v-model="check2" label="是否因恐慌而违背计划？" />
      <el-checkbox v-model="check3" label="是否保留了足够的现金流？" />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { MINDSET_QUOTES } from '../core';

const quotes = MINDSET_QUOTES;
const check1 = ref(false);
const check2 = ref(false);
const check3 = ref(true);
</script>

<style scoped>
.mindset-module {
  margin-top: 20px;
}
.quote-text {
  color: #409EFF;
  font-style: italic;
  text-align: center;
  line-height: 100px;
  margin: 0;
}
.checklist {
  display: flex;
  flex-direction: column;
  margin-top: 10px;
}
</style>
