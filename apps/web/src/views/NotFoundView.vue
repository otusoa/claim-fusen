<template>
  <UEmpty
    icon="i-lucide-file-question-mark"
    title="ページが見つかりません"
    description="URLを確認するか、プロジェクト一覧へ戻ってください。"
    :actions="[{ label: 'プロジェクト一覧へ', to: '/projects' }]"
  />
</template>
