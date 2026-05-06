import antfu from '@antfu/eslint-config'

export default antfu({
  rules: {
    'style/comma-dangle': ['warn', 'never']
  },

  vue: {
    overrides: {
      'vue/block-order': ['error', {
        order: ['style', 'template', 'script']
      }],
      'vue/comma-dangle': ['warn', 'never']
    }
  },

  jsonc: {
    overrides: {
      'jsonc/comma-dangle': ['warn', 'never']
    }
  }
})
