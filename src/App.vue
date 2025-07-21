<template>
  <div id="app">
    <KnowledgeGraphThree />
  </div>
</template>

<script>
import KnowledgeGraphThree from './components/KnowledgeGraphThree.vue'

export default {
  name: 'App',
  components: {
    KnowledgeGraphThree
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  overflow: hidden;
}

#app {
  width: 100%;
  height: 100%;
}
</style>
