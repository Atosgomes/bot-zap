const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js'); // Incluído LocalAuth para persistência de sessão

// Criação do cliente com persistência de sessão
const client = new Client({
    authStrategy: new LocalAuth() // Salva automaticamente a sessão em .wwebjs_auth/
});

// Objeto para controlar o estado da conversa
const estados = {};
const timers = {}; // Objeto para controlar os timers de cada usuário

// Gera e exibe o QR Code no terminal
client.on('qr', (qr) => {
    console.log('Por favor, escaneie o QR Code abaixo para conectar:');
    qrcode.generate(qr, { small: true });
});

// Informa quando o bot está pronto
client.on('ready', () => {
    console.log('Bot está pronto e conectado ao WhatsApp!');
});

// Reinicia o estado do usuário após 5 minutos de inatividade
const reiniciarEstado = (numero, message) => {
    delete estados[numero];
    if (timers[numero]) {
        clearTimeout(timers[numero]); // Limpa o timer existente
        delete timers[numero];
    }
    console.log(`Reiniciou o estado do usuário ${numero} por inatividade.`);
    if (message) {
        message.reply('❌ Você foi desconectado por inatividade. Se precisar de algo, é só chamar! ❌');
    }
};

// Reseta o timer de inatividade para o usuário
const resetarTimer = (numero, message) => {
    if (timers[numero]) {
        clearTimeout(timers[numero]); // Limpa o timer existente
    }
    timers[numero] = setTimeout(() => {
        reiniciarEstado(numero, message);
    }, 5 * 60 * 1000); // Reinicia após 5 minutos
};

// Ouvindo mensagens recebidas
client.on('message', (message) => {
    const numero = message.from; // Identifica o número do usuário
    const nomeContato = message.notifyName || 'amigo'; // Nome do contato no WhatsApp (ou "amigo" como fallback)
    console.log(`Mensagem recebida de ${numero} (${nomeContato}): ${message.body}`);

    // Reseta o timer sempre que o usuário envia uma mensagem
    resetarTimer(numero, message);

    // Verifica o estado do usuário
    if (!estados[numero]) {
        // Primeira fase: Apresentar opções com saudação personalizada
        estados[numero] = 'fase1'; // Define o estado atual como "fase1"
        message.reply(`
👋 Olá, ${nomeContato}! Bem-vindo à CodeCraft! Escolha uma das opções:

1️⃣ - Gostaria de saber mais sobre nossos serviços.
2️⃣ - Preciso de ajuda com outra questão.
3️⃣ - Quero falar com um atendente.

Por favor, responda com o número da opção. 😊
        `);
    } else if (estados[numero] === 'fase1') {
        // Segunda fase: Processar a escolha do usuário
        if (message.body === '1') {
            message.reply('Nossos serviços incluem suporte técnico, vendas e consultoria. Precisa de mais detalhes?');
        } else if (message.body === '2') {
            message.reply('Sem problemas! Me diga com o que você precisa de ajuda.');
        } else if (message.body === '3') {
            message.reply('Conectando você a um atendente. Por favor, aguarde um momento!');
        } else {
            message.reply('Desculpe, não entendi sua resposta. Por favor, escolha uma das opções: 1, 2 ou 3.');
            return; // Não avança para a próxima fase se a resposta for inválida
        }

        // Após uma resposta válida, o estado muda para "fase2" (conversa livre)
        estados[numero] = 'fase2'; // Avança para a fase 2
    } else if (estados[numero] === 'fase2') {
        // Fase 2: Conversa livre (o bot não envia mensagens automáticas)
        console.log(`Fase 2: Mensagem recebida de ${numero}: ${message.body}`);
        
        // O bot só responde a comandos específicos nesta fase
        if (message.body.toLowerCase() === 'sair') {
            message.reply('Você saiu da conversa. Se precisar de algo, é só chamar!');
            reiniciarEstado(numero, message); // Remove o estado e o timer
        }

        // Caso contrário, não faz nada (conversa livre)
    }
});

// Inicializa o cliente
client.initialize();