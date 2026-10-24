// Configuração do Meu 2027. Este é o único arquivo que precisa ser editado.
window.MEU2027_CONFIG = {
  // Cole aqui a configuração do aplicativo da Web do Firebase.
  // Enquanto o apiKey estiver vazio, a ferramenta abre em modo prévia, sem login e sem salvar na nuvem.
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  },

  // Data em que o dia 1 abre (ano-mês-dia). Cada dia seguinte abre à meia-noite do dia seguinte, no horário de Brasília.
  inicio: "2026-12-10",

  // E-mails que veem todos os dias abertos antes da data, para testar.
  admins: ["isavfortunato@gmail.com"]
};
