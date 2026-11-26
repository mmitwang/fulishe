<template>
  <div class="merchant-profile">
    <el-card shadow="never" v-loading="loading">
      <template #header>
        <div class="card-header">
          <div>
            <div class="title">商户资料</div>
            <div class="subtitle">商户名称、编码及审核结果由平台维护，当前页面仅可更新联系资料。</div>
          </div>
          <el-tag v-if="profile.tenantName" :type="auditStatusMeta.type" effect="plain">
            {{ auditStatusMeta.text }}
          </el-tag>
        </div>
      </template>

      <el-alert
        v-if="loadFailed"
        title="商户资料加载失败，请刷新页面重试"
        type="error"
        :closable="false"
        class="load-alert"
      />

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="110px"
        class="profile-form"
        :disabled="loading || loadFailed"
      >
        <el-form-item label="商户名称">
          <el-input :model-value="profile.tenantName || '—'" disabled />
        </el-form-item>
        <el-form-item label="商户编码">
          <el-input :model-value="profile.tenantCode || '—'" disabled />
        </el-form-item>
        <el-form-item label="审核状态">
          <el-tag :type="auditStatusMeta.type">{{ auditStatusMeta.text }}</el-tag>
        </el-form-item>
        <el-form-item label="审核意见">
          <el-input :model-value="profile.auditRemark || '暂无审核意见'" type="textarea" :rows="2" readonly />
        </el-form-item>

        <el-divider content-position="left">联系资料</el-divider>

        <el-form-item label="联系人" prop="contactPerson">
          <el-input v-model="form.contactPerson" placeholder="请输入联系人" maxlength="50" />
        </el-form-item>
        <el-form-item label="联系电话" prop="contactPhone">
          <el-input v-model="form.contactPhone" placeholder="请输入联系电话" maxlength="30" />
        </el-form-item>
        <el-form-item label="联系邮箱" prop="contactEmail">
          <el-input v-model="form.contactEmail" placeholder="请输入联系邮箱" maxlength="100" />
        </el-form-item>
        <el-form-item label="联系地址" prop="address">
          <el-input v-model="form.address" type="textarea" :rows="3" placeholder="请输入联系地址" maxlength="200" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="handleSubmit">保存资料</el-button>
          <el-button :disabled="saving" @click="resetForm">恢复原资料</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import request from '@/utils/request'

const loading = ref(false)
const saving = ref(false)
const loadFailed = ref(false)
const formRef = ref<FormInstance>()
const profile = ref<any>({})

const form = reactive({
  contactPerson: '',
  contactPhone: '',
  contactEmail: '',
  address: ''
})

const originalForm = reactive({ ...form })

const rules: FormRules = {
  contactPerson: [{ required: true, message: '请输入联系人', trigger: 'blur' }],
  contactPhone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
  contactEmail: [{ type: 'email', message: '请输入正确的邮箱地址', trigger: ['blur', 'change'] }]
}

const auditStatusMeta = computed(() => {
  const status = Number(profile.value.auditStatus)
  if (!profile.value.tenantName) return { text: '资料未加载', type: 'info' as const }
  return ({
    0: { text: '待审核', type: 'warning' },
    1: { text: '审核通过', type: 'success' },
    2: { text: '审核驳回', type: 'danger' }
  } as Record<number, { text: string; type: 'primary' | 'success' | 'warning' | 'info' | 'danger' }>)[status] || { text: '未知状态', type: 'info' as const }
})

const applyProfile = (data: any) => {
  profile.value = data || {}
  Object.assign(form, {
    contactPerson: data?.contactPerson || '',
    contactPhone: data?.contactPhone || '',
    contactEmail: data?.contactEmail || '',
    address: data?.address || ''
  })
  Object.assign(originalForm, form)
  formRef.value?.clearValidate()
}

const fetchProfile = async () => {
  loading.value = true
  loadFailed.value = false
  try {
    applyProfile(await request.get('/admin/merchant/profile'))
  } catch (error) {
    profile.value = {}
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  Object.assign(form, originalForm)
  formRef.value?.clearValidate()
}

const handleSubmit = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    const payload = {
      contactPerson: form.contactPerson,
      contactPhone: form.contactPhone,
      contactEmail: form.contactEmail,
      address: form.address
    }
    const data = await request.put('/admin/merchant/profile', payload)
    applyProfile(data)
    ElMessage.success('商户联系资料已保存')
  } finally {
    saving.value = false
  }
}

onMounted(fetchProfile)
</script>

<style scoped lang="scss">
.merchant-profile {
  .el-card {
    border-radius: 14px;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;

    .title {
      color: #303133;
      font-size: 16px;
      font-weight: 600;
    }

    .subtitle {
      margin-top: 5px;
      color: #909399;
      font-size: 12px;
      line-height: 1.6;
    }
  }

  .load-alert {
    margin-bottom: 20px;
  }

  .profile-form {
    width: min(760px, 100%);
    margin: 0 auto;
  }
}

@media (max-width: 600px) {
  .merchant-profile {
    .card-header {
      align-items: flex-start;
    }

    .profile-form {
      :deep(.el-form-item__label) {
        width: 88px !important;
      }

      :deep(.el-form-item__content) {
        margin-left: 88px !important;
      }
    }
  }
}
</style>
