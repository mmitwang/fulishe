<template>
  <div class="pay-config">
    <el-card>
      <div class="config-tabs">
        <el-tabs v-model="activeTab" @tab-change="handleTabChange">
          <el-tab-pane label="微信支付配置" name="wechat" />
          <el-tab-pane label="支付宝配置" name="alipay" />
          <el-tab-pane label="银行卡配置" name="bank" />
        </el-tabs>
      </div>

      <el-form :model="configForm" label-width="120px" class="config-form">
        <template v-if="activeTab === 'wechat'">
          <el-form-item label="商户ID" required>
            <el-input v-model="configForm.wechat.mchId" placeholder="请输入微信商户ID" />
          </el-form-item>
          <el-form-item label="AppID" required>
            <el-input v-model="configForm.wechat.appId" placeholder="请输入微信AppID" />
          </el-form-item>
          <el-form-item label="API密钥" required>
            <el-input v-model="configForm.wechat.apiKey" type="password" placeholder="请输入API密钥" show-password />
          </el-form-item>
          <el-form-item label="证书路径">
            <el-input v-model="configForm.wechat.certPath" placeholder="请输入证书路径" />
          </el-form-item>
          <el-form-item label="回调地址">
            <el-input v-model="configForm.wechat.notifyUrl" placeholder="请输入回调地址" />
          </el-form-item>
          <el-form-item label="启用状态">
            <el-switch v-model="configForm.wechat.enabled" />
          </el-form-item>
        </template>

        <template v-if="activeTab === 'alipay'">
          <el-form-item label="商户ID" required>
            <el-input v-model="configForm.alipay.appId" placeholder="请输入支付宝商户ID" />
          </el-form-item>
          <el-form-item label="商户私钥" required>
            <el-input v-model="configForm.alipay.privateKey" type="textarea" :rows="4" placeholder="请输入商户私钥" />
          </el-form-item>
          <el-form-item label="支付宝公钥" required>
            <el-input v-model="configForm.alipay.publicKey" type="textarea" :rows="4" placeholder="请输入支付宝公钥" />
          </el-form-item>
          <el-form-item label="签名类型">
            <el-select v-model="configForm.alipay.signType" placeholder="请选择签名类型">
              <el-option value="RSA2" label="RSA2" />
              <el-option value="RSA" label="RSA" />
            </el-select>
          </el-form-item>
          <el-form-item label="回调地址">
            <el-input v-model="configForm.alipay.notifyUrl" placeholder="请输入回调地址" />
          </el-form-item>
          <el-form-item label="启用状态">
            <el-switch v-model="configForm.alipay.enabled" />
          </el-form-item>
        </template>

        <template v-if="activeTab === 'bank'">
          <el-form-item label="银联商户ID" required>
            <el-input v-model="configForm.bank.mchId" placeholder="请输入银联商户ID" />
          </el-form-item>
          <el-form-item label="银联证书" required>
            <el-input v-model="configForm.bank.certPath" placeholder="请输入银联证书路径" />
          </el-form-item>
          <el-form-item label="交易密码">
            <el-input v-model="configForm.bank.transactionPassword" type="password" placeholder="请输入交易密码" show-password />
          </el-form-item>
          <el-form-item label="回调地址">
            <el-input v-model="configForm.bank.notifyUrl" placeholder="请输入回调地址" />
          </el-form-item>
          <el-form-item label="启用状态">
            <el-switch v-model="configForm.bank.enabled" />
          </el-form-item>
        </template>

        <el-form-item>
          <el-button type="primary" @click="handleSave">保存配置</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card style="margin-top: 20px">
      <template #header>
        <span>租户支付配置</span>
        <el-button type="primary" size="small" @click="showAddTenant = true">新增配置</el-button>
      </template>

      <el-table :data="tenantConfigs as any[]" style="width: 100%" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="tenantId" label="租户ID" width="100" />
        <el-table-column prop="tenantName" label="租户名称" width="150" />
        <el-table-column prop="payMethods" label="支付方式" width="180">
          <template #default="{ row }">
            <el-tag v-for="method in (row as any).payMethods" :key="method" :type="getMethodType(method) as any">
              {{ getMethodName(method) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="enabled" label="启用状态" width="100">
          <template #default="{ row }">
            <el-switch v-model="(row as any).enabled" @change="handleTenantEnableChange(row as any)" />
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" min-width="180" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button size="small" @click="handleEditTenant(row as any)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDeleteTenant(row as any)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="showAddTenant" :title="isEdit ? '编辑租户配置' : '新增租户配置'" width="500px">
      <el-form :model="tenantForm" label-width="100px">
        <el-form-item label="租户ID" required>
          <el-input v-model="tenantForm.tenantId" :disabled="isEdit" placeholder="请输入租户ID" />
        </el-form-item>
        <el-form-item label="租户名称">
          <el-input v-model="tenantForm.tenantName" placeholder="请输入租户名称" />
        </el-form-item>
        <el-form-item label="支持的支付方式" required>
          <el-checkbox-group v-model="tenantForm.payMethods">
            <el-checkbox :value="1">微信支付</el-checkbox>
            <el-checkbox :value="2">支付宝</el-checkbox>
            <el-checkbox :value="3">银行卡</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="tenantForm.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddTenant = false">取消</el-button>
        <el-button type="primary" @click="handleSaveTenant">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

interface WechatConfig {
  mchId: string
  appId: string
  apiKey: string
  certPath: string
  notifyUrl: string
  enabled: boolean
}

interface AlipayConfig {
  appId: string
  privateKey: string
  publicKey: string
  signType: string
  notifyUrl: string
  enabled: boolean
}

interface BankConfig {
  mchId: string
  certPath: string
  transactionPassword: string
  notifyUrl: string
  enabled: boolean
}

interface TenantConfig {
  id: number
  tenantId: number
  tenantName: string
  payMethods: number[]
  enabled: boolean
  createTime: string
}

const activeTab = ref('wechat')

const configForm = reactive({
  wechat: {
    mchId: '',
    appId: '',
    apiKey: '',
    certPath: '',
    notifyUrl: '',
    enabled: true
  } as WechatConfig,
  alipay: {
    appId: '',
    privateKey: '',
    publicKey: '',
    signType: 'RSA2',
    notifyUrl: '',
    enabled: true
  } as AlipayConfig,
  bank: {
    mchId: '',
    certPath: '',
    transactionPassword: '',
    notifyUrl: '',
    enabled: false
  } as BankConfig
})

const tenantConfigs = ref<TenantConfig[]>([])
const showAddTenant = ref(false)
const isEdit = ref(false)
const tenantForm = reactive({
  id: null as number | null,
  tenantId: '' as string | number,
  tenantName: '',
  payMethods: [] as number[],
  enabled: true
})

const mockTenantConfigs: TenantConfig[] = [
  { id: 1, tenantId: 1, tenantName: '测试租户1', payMethods: [1, 2], enabled: true, createTime: '2024-01-15 10:00:00' },
  { id: 2, tenantId: 2, tenantName: '测试租户2', payMethods: [1, 2, 3], enabled: true, createTime: '2024-01-15 11:00:00' },
  { id: 3, tenantId: 3, tenantName: '测试租户3', payMethods: [1], enabled: false, createTime: '2024-01-15 12:00:00' }
]

const getMethodName = (method: number) => {
  const names: Record<number, string> = { 1: '微信支付', 2: '支付宝', 3: '银行卡' }
  return names[method] || '未知'
}

const getMethodType = (method: number) => {
  const types: Record<number, string> = { 1: 'success', 2: 'primary', 3: 'warning' }
  return types[method] || 'info'
}

const handleTabChange = () => {
}

const handleSave = () => {
  ElMessage.success('支付配置已保存')
}

const handleReset = () => {
  if (activeTab.value === 'wechat') {
    configForm.wechat = { mchId: '', appId: '', apiKey: '', certPath: '', notifyUrl: '', enabled: true }
  } else if (activeTab.value === 'alipay') {
    configForm.alipay = { appId: '', privateKey: '', publicKey: '', signType: 'RSA2', notifyUrl: '', enabled: true }
  } else if (activeTab.value === 'bank') {
    configForm.bank = { mchId: '', certPath: '', transactionPassword: '', notifyUrl: '', enabled: false }
  }
}

const loadTenantConfigs = () => {
  tenantConfigs.value = mockTenantConfigs
}

const handleTenantEnableChange = (row: TenantConfig) => {
  ElMessage.success(`租户${row.tenantName}状态已更新`)
}

const handleEditTenant = (row: TenantConfig) => {
  isEdit.value = true
  tenantForm.id = row.id
  tenantForm.tenantId = row.tenantId
  tenantForm.tenantName = row.tenantName
  tenantForm.payMethods = [...row.payMethods]
  tenantForm.enabled = row.enabled
  showAddTenant.value = true
}

const handleDeleteTenant = async (row: TenantConfig) => {
  await ElMessageBox.confirm(`确认删除租户 ${row.tenantName} 的支付配置？`, '提示', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning'
  })

  ElMessage.success('删除成功')
}

const handleSaveTenant = () => {
  if (!tenantForm.tenantId) {
    ElMessage.warning('请输入租户ID')
    return
  }
  if (tenantForm.payMethods.length === 0) {
    ElMessage.warning('请选择至少一种支付方式')
    return
  }

  ElMessage.success(isEdit.value ? '租户配置已更新' : '租户配置已添加')
  showAddTenant.value = false
}

onMounted(() => {
  loadTenantConfigs()
})
</script>

<style lang="scss" scoped>
.pay-config {
  .config-tabs {
    margin-bottom: 20px;
  }

  .config-form {
    max-width: 600px;
  }
}
</style>