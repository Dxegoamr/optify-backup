# 🔧 Configuração do Firebase para Reset de Senha

## 📋 Checklist de Configuração:

### **1. Autorizar Domínios**

No Firebase Console:
1. Vá para **Authentication** → **Settings** → **Authorized domains**
2. Adicione os seguintes domínios:
   - ✅ `optify.host`
   - ✅ `optify-definitivo.web.app`
   - ✅ `optify-definitivo.firebaseapp.com`
   - ✅ `localhost` (desenvolvimento)

### **2. Configurar Email Template**

1. Vá para **Authentication** → **Templates**
2. Selecione **"Password reset"**
3. Clique em **"Edit"**
4. Configure:

**Assunto:**
```
Redefinir sua senha do Optify
```

**Corpo do Email:**
```html
Olá,

Você solicitou a redefinição de senha para sua conta Optify.

Clique no link abaixo para redefinir sua senha:
{{ .Link }}

Se você não solicitou esta redefinição, ignore este e-mail.

Este link expira em 3 horas.

Equipe Optify
```

**Action URL:**
```
https://optify-definitivo.web.app/reset-password
```

### **3. Verificar Configurações de Email**

1. Vá para **Authentication** → **Settings** → **Users**
2. Verifique se o email está configurado corretamente
3. Teste enviando um email de reset

---

## 🧪 Teste Rápido:

1. **Acesse:** `https://optify-definitivo.web.app/login`
2. **Digite seu e-mail**
3. **Clique em "Esqueci minha senha"**
4. **Verifique sua caixa de entrada**
5. **Clique no link recebido**
6. **Defina uma nova senha**

---

## ✅ Status Atual:

- ✅ **Código implementado** - Tudo funcionando
- ✅ **Rotas configuradas** - `/reset-password` funcionando
- ✅ **Tratamento de erros** - Completo
- ✅ **Validação de senha** - Implementada
- ⚠️ **Email template** - Precisa configurar no Firebase Console
- ⚠️ **Domínios autorizados** - Verificar no Firebase Console

---

**💡 Após configurar no Firebase Console, a funcionalidade estará 100% operacional!**





















