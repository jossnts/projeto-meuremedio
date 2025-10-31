"use strict";

// --- Estado Global da Aplicação ---
// Usamos 'let' para variáveis que podem ser recarregadas do localStorage
let todosMedicamentos = [];
let nomeUsuario = '';
let medicamentoNotificacaoAtual = null;
let sinteseVoz = window.speechSynthesis;
let ultimoTextoFalado = '';
let timeoutFala;
let audioPersonalizado = null;


// --- Dados Temporários para o Assistente ---
// Usamos sessionStorage para guardar dados entre os passos
let dadosNovoMedicamento = {};
let timersDeInsistencia = {}; // Guarda os timers de "a cada 10 min"

let cliquesConfirmacao = {}; // NOVO: Armazena a contagem de cliques por ID
let timeoutLimparCliques; // NOVO: Timeout para zerar a contagem após 5 segundos


// --- INICIALIZAÇÃO ---
// Executa quando o HTML da página termina de carregar
document.addEventListener('DOMContentLoaded', () => {

    // 1. Carregar dados essenciais
    nomeUsuario = localStorage.getItem('medHelperNomeUsuario') || '';
    todosMedicamentos = JSON.parse(localStorage.getItem('medHelperMedicamentos')) || [];

    // 2. Identificar a página atual
    const paginaAtual = document.body.parentElement.getAttribute('data-pagina') || identificarPaginaPorID();

  // 3. Lógica de Redirecionamento (CORRIGIDA)
// Se o usuário NÃO tem nome E está tentando acessar QUALQUER página QUE NÃO SEJA login, boasvindas ou termos,
// força ele a ir para a tela de login.
if (!nomeUsuario && paginaAtual !== 'login' && paginaAtual !== 'boasvindas' && paginaAtual !== 'termos') { // <-- CORREÇÃO AQUI
    console.log("Usuário sem nome tentando acessar página interna. Redirecionando para login.");
    window.location.href = 'login.html';
    return; // Para a execução para evitar erros
}

// Se o usuário JÁ TEM nome E está tentando acessar a página de login ou boasvindas,
// manda ele direto para a home.
if (nomeUsuario && (paginaAtual === 'login' || paginaAtual === 'boasvindas')) {
    console.log("Usuário com nome acessando login/boasvindas. Redirecionando para home.");
    window.location.href = 'home.html';
    return; // Para a execução
}

if (paginaAtual === 'boasvindas') {
        configurarAssistenteBoasVindas(); // CHAMA A FUNÇÃO ATUALIZADA

        // Botão Começar (Etapa 1 -> Etapa 2)
    const btnComecar = document.getElementById('btnComecarBoasVindas');
    if (btnComecar) {
        btnComecar.addEventListener('click', () => {
            etapaAtual = 2; // Avança para a primeira dica de acessibilidade/tutorial
            mostrarEtapa(etapaAtual);
        });
    }
    }
   // 4. Lógica de Ativação da Leitura (CORRIGIDA)
// Verifica se é a primeira vez que o usuário abre o app.
if (localStorage.getItem('medHelperLeituraMouse') === null) {
    // Se for a primeira vez, define a leitura por mouse como ativada por padrão.
    localStorage.setItem('medHelperLeituraMouse', 'true');
}

// Garante que, em QUALQUER página, a função de leitura comece desligada.
// Ela será ativada depois, se a configuração salva no localStorage permitir.
alternarOuvintesTTS(false);

    /// SUBSTITUA O BLOCO ANTIGO DE "DOMContentLoaded" (item 5 até 8) POR ESTE:

    // SUBSTITUA O BLOCO ANTIGO DE "DOMContentLoaded" (item 5 até 8) POR ESTE:

    // 5. Injetar componentes comuns
    const paginasComNav = ['home', 'medicamentos', 'adicionar', 'historico', 'configuracoes', 'orientacoes', 'avisos'];

    // Injeta a barra de navegação SÓ nas páginas principais
    if (paginasComNav.includes(paginaAtual)) {
        injetarNavInferior(paginaAtual);
    }
    
    // Injeta o painel e os modais em TODAS as páginas (elas precisam)
    if (paginaAtual) { 
        injetarPainelAcessibilidade();
        injetarContainersNotificacao();
    }
    
    // 6. Carregar configurações de acessibilidade salvas
    carregarConfiguracoesSalvas();

    // 7. Configurar ouvintes de eventos
    configurarOuvintesGlobais();

    // 8. Configurar a página específica
    switch (paginaAtual) {
        case 'home':
            configurarPaginaHome();
            break;
        case 'medicamentos':
            configurarPaginaMedicamentos();
            break;
        case 'configuracoes':
            configurarPaginaConfiguracoes();
            break;
        case 'boasvindas':
            configurarAssistente('boasvindas');
            break;
        case 'adicionar':
            configurarAssistente('adicionar');
            break;
        case 'editar':
            configurarPaginaEditar();
            break;
        case 'login':
            configurarPaginaLogin();
            break;
        case 'avisos':
            configurarPaginaAvisos();
            break;
        case 'historico':
            configurarPaginaHistorico();
            break;
        // O case 'orientacoes' foi REMOVIDO pois não tinha função
        case 'termos':
            configurarPaginaTermos();
            break;
            case 'relatorio':
        configurarPaginaRelatorio();
        break;
    }

    // 8.1 - Inicia o verificador de doses perdidas
// ... (o resto do DOMContentLoaded continua daqui)

    // 8.1 - Inicia o verificador de doses perdidas
// ... (o resto do DOMContentLoaded continua daqui)
    // 8.1 - Inicia o verificador de doses perdidas
// ... (o resto do DOMContentLoaded continua daqui)

       // CÓDIGO PARA ADICIONAR (Depois do switch, dentro do DOMContentLoaded)

// 8.1 - Inicia o verificador de doses perdidas
// Verifica agora e depois a cada 10 minutos
verificarDosesPerdidas();
setInterval(verificarDosesPerdidas, 600000); // 600000 ms = 10 minutos

    // 9. Lógica da Saudação de Voz (Apenas para páginas principais)
    if (paginaAtual === 'home' || paginaAtual === 'medicamentos' || paginaAtual === 'configuracoes') {
        const saudacaoJaFeita = localStorage.getItem('medHelperSaudacaoFeita') === 'true';

        if (!saudacaoJaFeita) {
            // SE FOR A PRIMEIRA VEZ, TOCA A SEQUÊNCIA DE FALA
            setTimeout(() => {
                const frase1 = "Bem-vindo ao MeuRemédio. Para opções de acessibilidade, toque no ícone de cadeira de rodas.";
                const frase2 = "Para ouvir esta página em voz alta, toque no ícone de alto falante.";

                falarFeedbackCritico(frase1, () => {
                    falarFeedbackCritico(frase2, () => {
                        // Ao final da fala, ativa a leitura e MARCA COMO FEITO
                        alternarOuvintesTTS(true);
                        localStorage.setItem('medHelperSaudacaoFeita', 'true');
                    });
                });
            }, 500);
        } else {
            // SE NÃO FOR A PRIMEIRA VEZ, APENAS ATIVA A LEITURA POR MOUSE IMEDIATAMENTE
            alternarOuvintesTTS(true);
        }
    }
});

/**
 * Identifica a página atual com base no ID da tag <body> ou <div.pagina>
 */
// COLE ESTA VERSÃO CORRIGIDA (em roteiro.js)
function identificarPaginaPorID() {
    if (document.getElementById('pagina-home')) return 'home';
    if (document.getElementById('pagina-medicamentos')) return 'medicamentos';
    if (document.getElementById('pagina-configuracoes')) return 'configuracoes';
    if (document.getElementById('pagina-termos')) return 'termos'; // <-- ADICIONADO
    if (document.querySelector('.login-container')) return 'login'; // <-- ADICIONADO
    if (document.querySelector('.assistente-container') && window.location.href.includes('boasvindas')) return 'boasvindas';
    if (document.querySelector('.assistente-container') && window.location.href.includes('adicionar')) return 'adicionar';
    return null;
}


// --- INJEÇÃO DE HTML COMUM ---

/**
 * Cria e insere o Painel de Acessibilidade na página.
 * Isso evita repetir o mesmo HTML em todos os arquivos.
 */
function injetarPainelAcessibilidade() {
    const painelHTML = `
    <div class="painel-acessibilidade" id="painelAcessibilidade" aria-hidden="true">
        <h2>Configurações de Acessibilidade</h2>
        
        <div class="opcao-acessibilidade">
            <label>
                <input type="checkbox" id="toggleModoEscuro">
                <span>Modo Escuro</span>
            </label>
        </div>
        
        <div class="opcao-acessibilidade">
            <label>
                <input type="checkbox" id="toggleAltoContraste">
                <span>Modo Alto Contraste</span>
            </label>
        </div>
        
        <div class="opcao-acessibilidade">
            <label>
                <input type="checkbox" id="toggleLeituraMouse">
                <span>Ler ao passar o mouse/dedo</span>
            </label>
        </div>


        <div class="opcao-acessibilidade">
            <label>
                <input type="checkbox" id="toggleVisaoSimplificada">
                <span>Visão Simplificada</span>
            </label>
        </div>
        
        <div class="opcao-acessibilidade">
            <label>
                <input type="checkbox" id="toggleVibracao">
                <span>Vibração</span>
            </label>
        </div>
        
        <div class="opcao-acessibilidade">
            <label>Tamanho da fonte:</label>
            <div class="grupo-botoes-fonte">
                <button id="btnFontePequena" class="btn-acao" aria-label="Diminuir fonte">A-</button>
                <button id="btnFonteNormal" class="btn-acao" aria-label="Fonte normal">A</button>
                <button id="btnFonteGrande" class="btn-acao" aria-label="Aumentar fonte">A+</button>
            </div>
        </div>
        
        <div class="opcao-acessibilidade">
            <label>Som do lembrete (clique para testar):</label>
            <select id="selectSomLembrete" class="input-formulario">
                <option value="vibracao">Vibração</option>
                <option value="sino">Sino</option>
                <option value="campainha">Campainha</option>
                <option value="bipe">Bipe</option>
                <option value="melodia">Melodia</option>
                <option value="personalizado">Personalizado</option>
            </select>
        </div>

        <div class="opcao-acessibilidade" id="opcaoSomPersonalizado" style="display: none;">
    <label id="labelSomSalvo">Áudio Salvo:</label>
    <span id="nomeSomSalvo" class="nome-arquivo-salvo">Nenhum</span> 
    <label for="inputSomPersonalizado" class="etiqueta-assistente btn-secundario">Trocar Som</label>
    <input type="file" id="inputSomPersonalizado" accept="audio/*" class="input-foto">
</div>
        
        <button id="btnFecharPainel" class="btn-principal">Fechar</button>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', painelHTML);
}

/**
 * Cria e insere a Barra de Navegação Inferior.
 * Destaca o botão da página atual.
 */
function injetarNavInferior(paginaAtual) {
    // CÓDIGO PARA MODIFICAR (Dentro de injetarNavInferior)

const navHTML = `
<nav class="nav-inferior">
    <a href="home.html" class="btn-nav ${paginaAtual === 'home' ? 'ativo' : ''}" data-pagina="home" aria-label="Início">
        <span class="icone-nav">🏠</span>
        <span class="texto-nav">Início</span>
    </a>
    <a href="medicamentos.html" class="btn-nav ${paginaAtual === 'medicamentos' ? 'ativo' : ''}" data-pagina="medicamentos" aria-label="Meus Medicamentos">
        <span class="icone-nav">💊</span>
        <span class="texto-nav">Medicamentos</span>
    </a>
    <a href="adicionar.html" class="btn-nav ${paginaAtual === 'adicionar' ? 'ativo' : ''}" data-pagina="adicionar" aria-label="Adicionar Medicamento">
        <span class="icone-nav">➕</span>
        <span class="texto-nav">Adicionar</span>
    </a>

    <a href="historico.html" class="btn-nav ${paginaAtual === 'historico' ? 'ativo' : ''}" data-pagina="historico" aria-label="Histórico de doses">
        <span class="icone-nav">📋</span>
        <span class="texto-nav">Histórico</span>
    </a>
    <a href="configuracoes.html" class="btn-nav ${paginaAtual === 'configuracoes' ? 'ativo' : ''}" data-pagina="configuracoes" aria-label="Configurações">
        <span class="icone-nav">⚙️</span>
        <span class="texto-nav">Configurações</span>
    </a>
</nav>`;
document.body.insertAdjacentHTML('beforeend', navHTML);
}

/**
 * Cria e insere os containers de notificação.
 */
// CÓDIGO PARA SUBSTITUIR (A função injetarContainersNotificacao inteira)

function injetarContainersNotificacao() {
    const notificacaoHTML = `
    <div class="modal-overlay" id="modalOverlay" style="display: none;"></div>

    <div class="modal-notificacao" id="notificacaoLembrete" style="display: none;">
    <button class="btn-fechar-modal" id="btnFecharModalLembrete" aria-label="Fechar aviso">✖️</button>
        <p id="notificacaoLembreteTexto">É hora de tomar seu medicamento!</p>

        <div class="botoes-modal-container">
            <button class="btn-modal btn-tomar" id="btnNotifTomar">✓ Tomei Agora</button>

            <div class="botoes-soneca-container">
                <button class="btn-modal btn-soneca" id="btnNotifAdiar30m">Adiar 30m</button>
                <button class="btn-modal btn-soneca" id="btnNotifAdiar1h">Adiar 1h</button>
            </div>

            <button class="btn-modal btn-pular" id="btnNotifPular">✕ Pular Dose</button>
        </div>
    </div>

    <div class="modal-notificacao modo-atraso" id="notificacaoAtraso" style="display: none;">
        <span class="icone-modal-atraso">⚠️</span>
        <p id="notificacaoAtrasoTexto">Seu remédio está atrasado!</p>

        <div class="botoes-modal-container">
            <div class="botoes-soneca-container">
                <button class="btn-modal btn-soneca" id="btnAtrasoAdiar30m">Adiar 30m</button>
                <button class="btn-modal btn-soneca" id="btnAtrasoAdiar1h">Adiar 1h</button>
            </div>

            <button class="btn-modal btn-ok" id="btnAtrasoOk">OK, vou tomar</button>
        </div>
    </div>

    <div class="notificacao sucesso" id="notificacaoTemporaria"></div>
    `;
    document.body.insertAdjacentHTML('beforeend', notificacaoHTML);
}

// EM: roteiro.js - SUBSTITUA A FUNÇÃO verificarLembretes INTEIRA

function verificarLembretes(dataAgora) { // DEVE ser definida sem 'const' ou 'let'
    const agora = dataAgora || new Date();
    const horaAtual = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); // Formato HH:MM (24h)
    const hojeString = agora.toDateString(); 

    todosMedicamentos.forEach(med => {
        if (med.dataFim && new Date(med.dataFim) < agora) {
            return; 
        }
        if (!med.horarios || med.horarios.length === 0) return; 

        med.horarios.forEach(horario => {
            if (horario === horaAtual) {
                // Verificar se já foi notificado HOJE para ESTE HORÁRIO
                const jaNotificadoOuTomado = med.historico.some(reg => 
                    reg.data === hojeString && 
                    reg.horario === horario && 
                    (reg.notificado === true || reg.tomado === true)
                );

                if (!jaNotificadoOuTomado) {
                    mostrarNotificacaoLembrete(med, horario); 

                    // Marcar como notificado e pendente
                    med.historico.push({
                        data: hojeString,
                        horario: horario,
                        notificado: true,
                        tomado: null // Marcado como pendente
                    });

                    localStorage.setItem('medHelperMedicamentos', JSON.stringify(todosMedicamentos));
                }
            }
        });
    });
}
// --- CONFIGURAÇÃO DAS PÁGINAS ---

function configurarPaginaHome() {
    
    // 1. Função de loop principal que roda a cada segundo
    function loopPrincipal() {
        const agora = new Date();
        
        // Atualiza o relógio visual (agora passamos 'agora' para ser mais eficiente)
        atualizarHora(agora); 
        
        // 2. DISPARADOR PRECISO:
        // Se os segundos são "00", é a hora exata da virada do minuto.
        if (agora.getSeconds() === 0) {
            console.log("Verificando lembretes às " + agora.toLocaleTimeString());
            verificarLembretes();
        }
    }

    // 3. Configuração inicial
    atualizarSaudacao();
    carregarListaMedicamentos('home');
    
    // 4. Roda o loop pela primeira vez e agenda o timer de 1 segundo
    loopPrincipal(); 
    setInterval(loopPrincipal, 1000);

    // 5. Verifica lembretes perdidos (o de 10 min)
    verificarLembretes(new Date()); 
    
}

function configurarPaginaMedicamentos() {
    carregarListaMedicamentos('completa'); // Carrega lista completa
}

function configurarPaginaConfiguracoes() {
    const inputNomeConfig = document.getElementById('inputNomeConfig');
    if (inputNomeConfig) {
        inputNomeConfig.value = nomeUsuario;
    }
}

// --- LÓGICA DO ASSISTENTE (WIZARD) ---

let etapaAtual = 1;
let fluxoAssistente = ''; // 'boasvindas' ou 'adicionar'

function configurarAssistente(fluxo) {
    fluxoAssistente = fluxo;
    // Limpa dados de um remédio anterior
    sessionStorage.removeItem('medHelperNovoMedicamento');
    dadosNovoMedicamento = {};

    // Listener do botão Começar (Etapa 1 -> Etapa 2)
    const btnComecar = document.getElementById('btnComecarBoasVindas');
    if (btnComecar) {
        btnComecar.addEventListener('click', () => {
            etapaAtual = 2; // Avança para a primeira dica de acessibilidade/tutorial
            mostrarEtapa(etapaAtual);
        });
    }

    if (fluxo === 'boasvindas') {
        etapaAtual = 1;
        mostrarEtapa(etapaAtual);
    } else if (fluxo === 'adicionar') {
        // Pula as etapas de boas-vindas (1, 2, 3) e vai para a etapa de "Nome do Remédio"
        // No HTML de 'adicionar.html', a etapa 1 é 'Nome do Remédio'
        etapaAtual = 1; 
        mostrarEtapa(etapaAtual);
    }

    // Configurar ouvintes dos botões do assistente
    document.querySelectorAll('.assistente-container [data-acao="proximo"]').forEach(btn => {
        btn.addEventListener('click', () => proximaEtapa());
    });
    document.querySelectorAll('.assistente-container [data-acao="voltar"]').forEach(btn => {
        btn.addEventListener('click', () => etapaAnterior());
    });

 // NOVO: Lógica de Pular Tutorial Completo
    document.querySelectorAll('.assistente-container [data-acao="pular-tudo"]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm("Tem certeza que deseja pular o tutorial? Você pode perder dicas importantes!")) {
                etapaAtual = 9; // <-- Pula para a Etapa 9 (Como podemos te chamar?)
                mostrarEtapa(etapaAtual);
            }
        });
    });

    
    
    // Botões com lógica específica
    if (fluxo === 'boasvindas') {
        document.getElementById('btnComecarBoasVindas').addEventListener('click', () => proximaEtapa());
        document.getElementById('btnSalvarNome').addEventListener('click', salvarNomeEProximaEtapa);
        document.getElementById('btnIniciarCadastroRemedio').addEventListener('click', () => proximaEtapa());
       document.getElementById('btnPularCadastro').addEventListener('click', () => {
            // Pula para a etapa de conclusão (Nova 20)
            etapaAtual = 20; 
            mostrarEtapa(etapaAtual);
        });
        document.getElementById('btnIrParaHome').addEventListener('click', () => {
            window.location.href = 'home.html';
        });
    }

    // Botões de intervalo (avançam sozinhos)
document.querySelectorAll('.btn-opcao-intervalo').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Remove 'ativo' de TODOS os botões de intervalo
        document.querySelectorAll('.btn-opcao-intervalo').forEach(b => b.classList.remove('ativo'));
        // Adiciona 'ativo' apenas ao que foi clicado
        e.currentTarget.classList.add('ativo');

        // Se estiver no assistente, salva e avança. Na tela de edição, só marca.
        if (fluxoAssistente) {
            const intervalo = e.currentTarget.getAttribute('data-intervalo');
            dadosNovoMedicamento.intervalo = parseInt(intervalo);
            proximaEtapa();
        }
    });
});

    // Botão de salvar (final)
    const btnSalvar = document.getElementById('btnSalvarRemedio');
    if (btnSalvar) {
        btnSalvar.addEventListener('click', salvarRemedioEConcluir);
    }

    // Preview da Foto
    const inputFoto = document.getElementById('inputFoto');
    if (inputFoto) {
        inputFoto.addEventListener('change', (e) => {
            const arquivo = e.target.files[0];
           if (arquivo) {
    
             // Salva o nome do arquivo

    // --- LINHA DA CORREÇÃO ADICIONADA AQUI ---
    // Atualiza o texto na tela para mostrar o nome do novo arquivo IMEDIATAMENTE.
    const elNomeSom = document.getElementById('nomeSomSalvo');
    if (elNomeSom) {
        elNomeSom.textContent = arquivo.name;
        localStorage.setItem('medHelperSomNome', arquivo.name);
    }
    // --- FIM DA CORREÇÃO ---

    const leitor = new FileReader();
    leitor.onload = (evento) => {
                    const preview = document.getElementById('previewFoto');
                    preview.src = evento.target.result;
                    preview.classList.add('visivel');
                    dadosNovoMedicamento.imagemUrl = evento.target.result; // Salva a imagem como Base64

                    // --- LINHA DA CORREÇÃO ADICIONADA AQUI ---
                     // Salva imediatamente na memória da sessão para não se perder.
                       sessionStorage.setItem('medHelperNovoMedicamento', JSON.stringify(dadosNovoMedicamento));
                }
                leitor.readAsDataURL(arquivo);
            }
        });
    }
    // --- LÓGICA PARA ORIENTAÇÕES MÉDICAS (Assistente) ---
    const checkOrientacao = document.getElementById('checkOrientacaoMedica');
    const campoOrientacao = document.getElementById('campoOrientacaoMedica');
    const inputOrientacao = document.getElementById('inputOrientacaoMedica');

    if (checkOrientacao && campoOrientacao && inputOrientacao) {
        checkOrientacao.addEventListener('change', (e) => {
            if (e.target.checked) {
                campoOrientacao.style.display = 'block';
                // FALA A INSTRUÇÃO QUANDO O CAMPO APARECE
                falarFeedbackCritico("Coloque exatamente o que seu médico te orientou.");
                inputOrientacao.focus(); // Coloca o cursor no campo de texto
            } else {
                campoOrientacao.style.display = 'none';
                inputOrientacao.value = ''; // Limpa o campo se desmarcar
            }
        });
    }
} // Este '}' fecha a função configurarAssistente


function mostrarEtapa(numeroEtapa) {

    // --- CORREÇÃO AQUI ---
    // 1. Cancela qualquer fala agendada pelo mouse da tela anterior
    clearTimeout(timeoutFala);
    // 2. Desativa a leitura por mouse imediatamente
    alternarOuvintesTTS(false); 
    // --- FIM DA CORREÇÃO ---

    
    // Esconde todas as etapas
    document.querySelectorAll('.etapa').forEach(etapa => {
        etapa.classList.remove('ativa');
    });
    
    // Mostra a etapa correta
    const etapaAlvo = document.querySelector(`.etapa[data-etapa="${numeroEtapa}"]`);
    if (etapaAlvo) {
        etapaAlvo.classList.add('ativa');
        
        // Foca no primeiro input da etapa, se houver
        const primeiroInput = etapaAlvo.querySelector('input, button.btn-principal, button.btn-opcao-intervalo');
        if (primeiroInput) {
            primeiroInput.focus();
        }
        
       // Lê o texto da etapa e, ao terminar, reativa a leitura por mouse
lerEtapaAtualEmVozAlta(() => {
    alternarOuvintesTTS(true);
});
    }
}

function proximaEtapa() {
    // 1. Validação e salvamento de dados da etapa ATUAL
    // Nota: A lógica de validação complexa está dentro de salvarDadosEtapa
    if (!salvarDadosEtapa(etapaAtual)) {
        // Se a validação falhar (ex: campo vazio), a função para aqui.
        return; 
    }
 // 2. Se a validação passou, avança o contador.
    etapaAtual++;
    // O resto do trabalho (mostrar a nova etapa, ler voz, etc.) é feito aqui:
    mostrarEtapa(etapaAtual);
}

function etapaAnterior() {
    // 1. A lógica de voltar não precisa de validação de campo.
    etapaAtual--;
    // 2. Volta a etapa.
    mostrarEtapa(etapaAtual);
}

function salvarNomeEProximaEtapa() {
    const inputNome = document.getElementById('inputNomeUsuario');
    if (inputNome.value.trim()) {
        nomeUsuario = inputNome.value.trim();
        localStorage.setItem('medHelperNomeUsuario', nomeUsuario);
        
        // Atualiza o título da etapa de conclusão
        const tituloConclusao = document.getElementById('tituloConclusao');
        if(tituloConclusao) {
            tituloConclusao.textContent = `Tudo pronto, ${nomeUsuario}!`;
        }
        
        proximaEtapa();
    } else {
        falarTexto("Por favor, digite seu nome.");
        alert("Por favor, digite seu nome.");
    }
}



/**
 * Salva os dados da etapa atual no objeto temporário
 */
// COLE ESTA VERSÃO CORRIGIDA (em roteiro.js)
// EM: roteiro.js - SUBSTITUA A FUNÇÃO salvarDadosEtapa INTEIRA
// EM: roteiro.js - SUBSTITUA A FUNÇÃO salvarDadosEtapa INTEIRA
// EM: roteiro.js - SUBSTITUA A FUNÇÃO salvarDadosEtapa INTEIRA
function salvarDadosEtapa(numeroEtapa) {
    let input;
    // CORREÇÃO: O fluxo 'adicionar' é a etapa 11 do 'boasvindas' (11-1 = 10)
    let etapaFluxoBoasVindas = numeroEtapa;
    if (fluxoAssistente === 'adicionar') {
        etapaFluxoBoasVindas = numeroEtapa + 10; 
    }

    // A numeração agora vai de 11 (Nome do Remédio) até 19 (Foto)
    switch (etapaFluxoBoasVindas) {
        
        case 9: // Nome do Usuário (Antiga Etapa 2)
            input = document.getElementById('inputNomeUsuario');
            if (!input.value.trim()) return false;
            nomeUsuario = input.value.trim();
            localStorage.setItem('medHelperNomeUsuario', nomeUsuario);
            break; 
            
        // Etapas 1, 2, 3, 4, 5, 6, 7 e 8 (Tutorial) não precisam salvar nada, então retornam true.
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
        case 6:
        case 7:
        case 8:
            break;

        // --- INÍCIO DO CADASTRO DO REMÉDIO (Antigas Etapas 4-12) ---
        
        case 11: // Nome do Remédio (Antiga 4 + 7)
            input = document.getElementById('inputNomeRemedio');
            if (!input.value.trim()) return false;
            dadosNovoMedicamento.nome = input.value.trim();
            break;
        case 12: // Apelido (Antiga 5 + 7)
            input = document.getElementById('inputApelidoRemedio');
            if (!input.value.trim()) return false;
            dadosNovoMedicamento.apelido = input.value.trim();
            break;
        
        case 13: // Cor (Antiga 6 + 7)
            input = document.getElementById('inputCorRemedio');
            dadosNovoMedicamento.cor = input.value.trim() || null; 
            break; 

        case 14: // Dose (Antiga 7 + 7)
            input = document.getElementById('inputDose');
            if (!input.value.trim()) return false;
            dadosNovoMedicamento.dose = input.value.trim();
            break;
        case 15: // Primeiro Horário (Antiga 8 + 7)
            input = document.getElementById('inputPrimeiroHorario');
            if (!input.value) return false;
            dadosNovoMedicamento.primeiroHorario = input.value;
            break;
        case 16: // Intervalo (Antiga 9 + 7)
            if (!dadosNovoMedicamento.intervalo) return false;
            break;
        case 17: // Duração (Antiga 10 + 7)
            input = document.getElementById('inputDuracao');
            dadosNovoMedicamento.duracao = input.value.trim() || null; 
            break;
        case 18: // Orientações Médicas (Antiga 11 + 7)
            const checkOrientacao = document.getElementById('checkOrientacaoMedica');
            const inputOrientacao = document.getElementById('inputOrientacaoMedica');
            dadosNovoMedicamento.temOrientacao = checkOrientacao.checked;
            dadosNovoMedicamento.textoOrientacao = checkOrientacao.checked ? inputOrientacao.value : null;
            break; 
        case 19: // Foto (Antiga 12 + 7)
            break;
    }
    
    // Salva o objeto inteiro no sessionStorage para persistir
    sessionStorage.setItem('medHelperNovoMedicamento', JSON.stringify(dadosNovoMedicamento));
    return true; // Sucesso
}

function salvarRemedioEConcluir() {
    // Recupera os dados
    dadosNovoMedicamento = JSON.parse(sessionStorage.getItem('medHelperNovoMedicamento')) || dadosNovoMedicamento;

    // Validação final (caso algo tenha se perdido)
    if (!dadosNovoMedicamento.nome || !dadosNovoMedicamento.apelido || !dadosNovoMedicamento.dose || !dadosNovoMedicamento.primeiroHorario || !dadosNovoMedicamento.intervalo) {
        alert("Ops! Alguns dados essenciais se perderam. Tente novamente.");
        falarTexto("Ops! Alguns dados essenciais se perderam. Tente novamente.");
        return;
    }

    // --- Lógica de salvar o remédio ---
    const dataInicio = new Date();
    let dataFim = null;
    if (dadosNovoMedicamento.duracao && parseInt(dadosNovoMedicamento.duracao) > 0) {
        dataFim = new Date(dataInicio);
        dataFim.setDate(dataInicio.getDate() + parseInt(dadosNovoMedicamento.duracao));
    }

    // Calcular horários
    const horarios = calcularHorarios(dadosNovoMedicamento.intervalo, dadosNovoMedicamento.primeiroHorario);

const temOrientacao = document.getElementById('checkOrientacaoMedica').checked;
const textoOrientacao = temOrientacao ? document.getElementById('inputOrientacaoMedica').value : null;
    const novoMedicamento = {
        id: Date.now().toString(),
        nome: dadosNovoMedicamento.nome,
        apelido: dadosNovoMedicamento.apelido,
        cor: dadosNovoMedicamento.cor || null, // <-- ADICIONE ESTA LINHA
        dose: dadosNovoMedicamento.dose,
        horarios: horarios,
        imagemUrl: dadosNovoMedicamento.imagemUrl || null,
        duracao: dadosNovoMedicamento.duracao,
        dataInicio: dataInicio.toISOString(),
        dataFim: dataFim ? dataFim.toISOString() : null,
        historico: [],
        temOrientacao: temOrientacao,
        textoOrientacao: textoOrientacao
    };
    
    todosMedicamentos.push(novoMedicamento);
    localStorage.setItem('medHelperMedicamentos', JSON.stringify(todosMedicamentos));
    
    // Limpa os dados temporários
    sessionStorage.removeItem('medHelperNovoMedicamento');
    dadosNovoMedicamento = {};

    // Avança para a etapa final
    if (fluxoAssistente === 'boasvindas') {
        proximaEtapa(); // Vai para a etapa 11 (Conclusão)
    } else if (fluxoAssistente === 'adicionar') {
        proximaEtapa(); // Vai para a etapa 8 (Conclusão)
        // Redireciona para a home após um breve momento
        falarTexto("Medicamento salvo!");
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 2000);
    }
}


// --- LÓGICA DE UI (Tela Principal) ---

// COLE ESTA VERSÃO CORRIGIDA (em roteiro.js - Substitua a função atualizarHora inteira)
// EM: roteiro.js - SUBSTITUA A FUNÇÃO atualizarHora INTEIRA
function atualizarHora(dataAgora) {
    const elHoraAtual = document.getElementById('horaAtual');
    if (elHoraAtual) {
        const agora = dataAgora || new Date(); 
        
        // CORREÇÃO FINAL: Garante o formato 24h (h23) no relógio grande da Home.
        const options = {
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23' 
        };
        
        elHoraAtual.textContent = agora.toLocaleTimeString('pt-BR', options);
    }
}

function atualizarSaudacao() {
    const elSaudacao = document.getElementById('saudacaoUsuario');
    if (elSaudacao) {
        elSaudacao.textContent = `Olá, ${nomeUsuario}!`;
    }
}

// --- LÓGICA DE MEDICAMENTOS (Carregar, Salvar, etc) ---

/**
 * Carrega e exibe os medicamentos na lista correta.
 * @param {'home' | 'completa'} tipo - Onde carregar a lista.
 */
// COLE ESTA VERSÃO CORRIGIDA (em roteiro.js)
// EM: roteiro.js - SUBSTITUA A FUNÇÃO carregarListaMedicamentos INTEIRA
// EM: roteiro.js - SUBSTITUA A FUNÇÃO carregarListaMedicamentos INTEIRA
// EM: roteiro.js - SUBSTITUA A FUNÇÃO carregarListaMedicamentos INTEIRA
function carregarListaMedicamentos(tipo) {
    const elListaHome = document.getElementById('listaMedicamentosHome');
    const elListaCompleta = document.getElementById('listaCompletaMedicamentos');
    const elInfoProximo = document.getElementById('infoProximoMedicamento');
    
    let elAlvo = (tipo === 'home') ? elListaHome : elListaCompleta;
    
    if (!elAlvo) return; 

    const agora = new Date(); 
    const medicamentosAtivos = todosMedicamentos.filter(med => {
        if (!med.dataFim) return true; 
        return (new Date(med.dataFim) > agora); 
    });

    if (medicamentosAtivos.length === 0) {
        elAlvo.innerHTML = `
            <div class="estado-vazio">
                <div class="icone-estado-vazio">💊</div>
                <p>Nenhum medicamento cadastrado.</p>
                <p>Adicione seu primeiro medicamento no botão "Adicionar"!</p>
            </div>
        `;
        if (elInfoProximo) elInfoProximo.innerHTML = '<p>Nenhum medicamento agendado.</p>';
        return;
    }
    
    elAlvo.innerHTML = ''; 
    let proximoHorarioGlobal = Infinity;
    let detalhesProximoGlobal = 'Nenhum medicamento agendado.';

    // CORREÇÃO:
    const medicamentosOrdenados = medicamentosAtivos.map(med => {
        const proximoHorario = obterProximoHorario(med); 
        return { med, proximoHorario };
    }).sort((a, b) => a.proximoHorario.timestamp - b.proximoHorario.timestamp);


    medicamentosOrdenados.forEach(item => {
        const med = item.med;
        const proximo = item.proximoHorario;

        // --- CORREÇÃO: A string 24h é a hora original salva (o que está correto) ---
        let hora24h = proximo.horaString; 
        
        // CORREÇÃO: A Home deve ignorar a dose de 1ms para o banner "Próximo Medicamento"
        if (proximo.timestamp > 1 && proximo.timestamp < proximoHorarioGlobal) {
            proximoHorarioGlobal = proximo.timestamp;
            detalhesProximoGlobal = `${med.apelido} (${med.dose}) às ${hora24h}`; 
        }

        // --- INÍCIO DA LÓGICA DE ATRASO CORRIGIDA ---
        let estaAtrasado = false;
        if (med.historico && med.historico.length > 0) {
            estaAtrasado = med.historico.some(reg => {
                if (reg.notificado === true && reg.tomado === null) {
                    const timestampProgramado = getTimestampProgramado(reg.data, reg.horario);
                    const diffMin = (agora.getTime() - timestampProgramado) / 60000;
                    return (diffMin > 0);
                }
                return false;
            });
        }
        // --- FIM DA LÓGICA DE ATRASO CORRIGIDA ---

        // ====================================================================
        // --- LÓGICA DE CONTADOR DE ADIANTAMENTO (15 MIN) ---
        // ====================================================================
        
        let statusProximaDose = hora24h; // Valor padrão: a hora agendada
        let btnTomarHTML = `<button class="btn-acao btn-tomar" data-id="${med.id}" aria-label="Tomar remédio ${med.apelido}">✓</button>`;

        if (tipo === 'home' && proximo) {
            const agoraTimestamp = new Date().getTime();
            const minutosParaProximaDose = Math.floor((proximo.timestamp - agoraTimestamp) / 60000);
            const TOLERANCIA_MINUTOS = 15; 

            if (minutosParaProximaDose > 0 && minutosParaProximaDose <= TOLERANCIA_MINUTOS) {
                statusProximaDose = `Liberado em ${minutosParaProximaDose} min`;
                btnTomarHTML = `<button class="btn-acao btn-tomar" data-id="${med.id}" aria-label="Tomar ${med.apelido} agora">✓</button>`;
            } else if (minutosParaProximaDose > TOLERANCIA_MINUTOS) {
                statusProximaDose = hora24h; 
                btnTomarHTML = `<button class="btn-acao btn-desligado" data-id="${med.id}" disabled aria-label="A dose não está liberada ainda">🕓</button>`;
            } 
        }
        
        // --- INÍCIO DA MONTAGEM DO CARTÃO ---
        const cartao = document.createElement('div');
        cartao.className = 'cartao-medicamento';
        
        if (med.temOrientacao) { cartao.classList.add('orientacao-especial'); }
        if (estaAtrasado) { cartao.classList.add('atrasado'); }

        cartao.innerHTML = `
        <div class="imagem-medicamento">
            ${med.imagemUrl ? `<img src="${med.imagemUrl}" alt="${med.nome}" style="width:100%;height:100%;border-radius:50%;">` : '💊'}
        </div>
        <div class="info-medicamento">
           <div class="nome-medicamento">${med.apelido} ${med.temOrientacao ? '<span class="icone-alerta-orientacao">⚠️</span>' : ''}</div>
            <div class="detalhes-medicamento">
                ${med.cor ? `<span class="cor-medicamento">${med.cor}</span>` : ''}
                <span class="dose-medicamento">${med.dose}</span>
                <span class="horario-medicamento">Próximo: ${statusProximaDose}</span> 
            </div> 
        </div>
        <div class="botoes-acao">
            ${btnTomarHTML}
            ${tipo === 'completa' ? `<a href="editar.html?id=${med.id}" class="btn-acao btn-editar" aria-label="Editar ${med.apelido}">✏️</a>` : ''}
        </div>
        `;
        elAlvo.appendChild(cartao);
    });

    if (elInfoProximo) {
        elInfoProximo.innerHTML = `<p>${detalhesProximoGlobal}</p>`;
    }
    
    configurarBotoesCartao();
}
/**
 * Adiciona listeners aos botões "Tomar" e "Deletar"
 */
function configurarBotoesCartao() {
    document.querySelectorAll('.btn-tomar').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            registrarMedicamentoTomado(id);
        });
    });
    
    document.querySelectorAll('.btn-deletar').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            deletarMedicamento(id);
        });
    });
}

function deletarMedicamento(id) {
    const med = todosMedicamentos.find(m => m.id === id);
    if (confirm(`Tem certeza que deseja remover o ${med.apelido}?`)) {
        todosMedicamentos = todosMedicamentos.filter(m => m.id !== id);
        localStorage.setItem('medHelperMedicamentos', JSON.stringify(todosMedicamentos));
        
        // Recarrega a lista
        if (document.getElementById('listaCompletaMedicamentos')) {
            carregarListaMedicamentos('completa');
        } else {
            carregarListaMedicamentos('home');
        }
        falarTexto('Medicamento removido.');
    }
}

/**
 * Calcula os horários com base no intervalo e primeiro horário
 */
function calcularHorarios(intervalo, primeiroHorario) {
    const horarios = [];
    // Garante que a hora e o minuto são tratados como números
    const [horaInicial, minutoInicial] = primeiroHorario.split(':').map(Number);
    let horaAtual = horaInicial;

    if (intervalo === 24) {
        horarios.push(primeiroHorario);
    } else {
        const dosesPorDia = Math.floor(24 / intervalo); // Garante que seja um número inteiro
        for (let i = 0; i < dosesPorDia; i++) {
            // Formata a hora para ter sempre dois dígitos (ex: 08)
            const horaFormatada = horaAtual.toString().padStart(2, '0');
            const minutoFormatado = minutoInicial.toString().padStart(2, '0');

            horarios.push(`${horaFormatada}:${minutoFormatado}`);

            // --- LÓGICA CORRIGIDA E EXPLÍCITA PARA 24H ---
            // Soma o intervalo à hora atual
            horaAtual = horaAtual + intervalo;
            // Se passar de 23, subtrai 24 para voltar ao início do dia
            if (horaAtual >= 24) {
                horaAtual = horaAtual - 24; // Ex: 16 + 8 = 24, vira 0h. 18 + 8 = 26, vira 2h.
            }
        }
    }
    return horarios.sort();
}
// COLE ESTA VERSÃO CORRIGIDA (em roteiro.js - Substitua a função obterProximoHorario inteira)
/**
// EM: roteiro.js - SUBSTITUA A FUNÇÃO obterProximoHorario INTEIRA
/**
// EM: roteiro.js - SUBSTITUA A FUNÇÃO obterProximoHorario INTEIRA
/**
* Encontra o próximo horário AGENDADO (A LÓGICA MAIS SIMPLES E ESTÁVEL).
 * @param {object} medicamento - O objeto completo do medicamento.
 * @returns {object} { horaString: 'HH:MM', timestamp: ..., dataAlvo: Date }
 */
function obterProximoHorario(medicamento) { 
    const horarios = medicamento.horarios;
    
    if (!horarios || horarios.length === 0) {
        return { horaString: null, timestamp: Infinity, dataAlvo: new Date(Infinity) };
    }
    
    const agora = new Date();
    const hojeString = agora.toDateString(); 
    
    let melhorTempoAteDose = Infinity;
    let melhorHorarioString = null;
    let melhorTimestamp = Infinity;
    let melhorDataAlvo = new Date(Infinity);

    horarios.forEach(horario => {
        let dataAlvo = new Date();
        const [h, m] = horario.split(':').map(Number);
        dataAlvo.setHours(h, m, 0, 0);
        
        const registroDeHoje = medicamento.historico.find(r => r.data === hojeString && r.horario === horario);
        const doseTomadaHoje = registroDeHoje && registroDeHoje.tomado === true;

        let tempoAteDose = dataAlvo.getTime() - agora.getTime();

        // 1. HORÁRIO JÁ PASSOU OU JÁ FOI TOMADO:
        if (tempoAteDose < 0 || doseTomadaHoje) {
            // Se já passou OU foi tomado, pulamos para amanhã.
            dataAlvo.setDate(dataAlvo.getDate() + 1);
            tempoAteDose = dataAlvo.getTime() - agora.getTime();
        } 
        
        // 2. Compara o tempo (o menor tempo positivo ganha)
        if (tempoAteDose < melhorTempoAteDose) {
            melhorTempoAteDose = tempoAteDose;
            melhorHorarioString = horario;
            melhorTimestamp = dataAlvo.getTime();
            melhorDataAlvo = dataAlvo;
        }
    });
    
    if (melhorHorarioString) {
        return { horaString: melhorHorarioString, timestamp: melhorTimestamp, dataAlvo: melhorDataAlvo };
    }
    
    // Fallback: Retorna a dose de amanhã mais cedo se nada foi achado.
    const horariosOrdenados = [...horarios].sort();
    const horarioMaisCedo = horariosOrdenados[0];
    
    const [h, m] = horarioMaisCedo.split(':').map(Number);
    const dataHorario = new Date();
    dataHorario.setHours(h, m, 0, 0);
    dataHorario.setDate(dataHorario.getDate() + 1);

    return { horaString: horarioMaisCedo, timestamp: dataHorario.getTime(), dataAlvo: dataHorario };
}

// COLE ESTA VERSÃO CORRIGIDA (em roteiro.js - Substitua a função mostrarNotificacaoLembrete inteira)
function mostrarNotificacaoLembrete(medicamento, horario) {
    const modal = document.getElementById('notificacaoLembrete');
    const overlay = document.getElementById('modalOverlay');
    const elTexto = document.getElementById('notificacaoLembreteTexto');
    if (!modal || !elTexto || !overlay) return;

    // Guarda o remédio atual na notificação
    medicamentoNotificacaoAtual = { medicamento, horario }; 

    // --- NOVO CÓDIGO: ADICIONA A IMAGEM/ÍCONE ---
    const imagemHTML = medicamento.imagemUrl ? 
        `<img src="${medicamento.imagemUrl}" alt="Foto do remédio" style="width:100px; height:100px; border-radius:50%; margin-bottom: 10px; object-fit: cover;">` : 
        `<span class="logo-icone" style="font-size: 3.5rem; margin-bottom: 10px;">💊</span>`;
    
    const fotoContainer = document.createElement('div');
    fotoContainer.innerHTML = imagemHTML;
    fotoContainer.style.textAlign = 'center';
    
    // Insere o container ANTES do texto da notificação
    modal.insertBefore(fotoContainer, elTexto);
    // --- FIM DO NOVO CÓDIGO ---

    elTexto.textContent = `Hora de tomar ${medicamento.apelido}!`;

    // Configura os botões da notificação
    configurarBotoesNotificacao(medicamento, horario, false)

    overlay.style.display = 'block';
    modal.style.display = 'block';
    tocarSomNotificacao();

    if (localStorage.getItem('medHelperVibracao') === 'true' && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200]);
    }

    alternarOuvintesTTS(false);

    let mensagemLembrete = `${nomeUsuario}, é hora de tomar o ${medicamento.apelido}. ${medicamento.dose}.`;
    if (medicamento.temOrientacao && medicamento.textoOrientacao) {
        mensagemLembrete += ` Atenção: ${medicamento.textoOrientacao}`;
    }

    falarFeedbackCritico(mensagemLembrete, () => {
        alternarOuvintesTTS(true);
    });
}


// COLE ESTA VERSÃO CORRIGIDA (em roteiro.js - Substitua a função registrarMedicamentoTomado inteira)
// EM: roteiro.js - SUBSTITUA A FUNÇÃO registrarMedicamentoTomado INTEIRA
function registrarMedicamentoTomado(id) {
    const med = todosMedicamentos.find(m => m.id === id);
    if (!med) return;

    // --- 1. SE VEIO DO POP-UP, REGISTRO É IMEDIATO (1 CLIQUE) ---
    if (medicamentoNotificacaoAtual && medicamentoNotificacaoAtual.medicamento.id === id) {
        registrarDoseEFeedback(id, true);
        fecharModaisNotificacao(); 
        return;
    } 

    // --- 2. VERIFICAÇÃO DE TEMPO E ESTADO (PARA CARTÃO MANUAL) ---
    const proximo = obterProximoHorario(med); 
    const horarioRecente = obterHorarioMaisRecente(med); // <-- CORREÇÃO: PASSA 'med'

    if (!horarioRecente) return;
    
    const agoraTimestamp = new Date().getTime();
    const minutosParaProximaDose = (proximo.timestamp - agoraTimestamp) / 60000;
    const minutosDeAtraso = horarioRecente.minutosAtras;
    const TOLERANCIA_MINUTOS_ADIANTADO = 15;
    
    let acaoNecessaria = 'uma-vez'; 
    let mensagemBloqueio = null; 

    // A. Lógica de BLOQUEIO (Muito longe no futuro)
    if (minutosParaProximaDose > TOLERANCIA_MINUTOS_ADIANTADO) {
        acaoNecessaria = 'bloquear';
        mensagemBloqueio = `A dose ainda não está liberada para uso (${proximo.horaString}). Não é possível registrar agora.`;
    }
    // B. Lógica de 3 CLIQUES (Adiantamento)
    else if (minutosParaProximaDose > 0 && minutosParaProximaDose <= TOLERANCIA_MINUTOS_ADIANTADO) {
        acaoNecessaria = 'tres-vezes';
    } 
    // C. Lógica de 1 CLIQUE (Atrasado ou Na Hora)
    else {
        acaoNecessaria = 'uma-vez';
    }

    // --- 4. EXECUÇÃO DA AÇÃO (Comando Final) ---

    // A. BLOQUEAR (Longe Demais)
    if (acaoNecessaria === 'bloquear') {
        falarFeedbackCritico(mensagemBloqueio);
        return;
    }

    // B. 1 CLIQUE (Atrasado ou Na Hora)
    if (acaoNecessaria === 'uma-vez') {
        // Correção do bug de duplicidade:
        const registroDuplicado = med.historico.find(r => 
            r.data === new Date().toDateString() && 
            r.horario === horarioRecente.horaString && 
            r.tomado === true
        );
        if (registroDuplicado) {
             const proximoHorario = obterProximoHorario(med).horaString;
             let mensagemVoz = proximoHorario ? `Você já tomou este remédio. A próxima dose é às ${proximoHorario}.` : `Você já tomou este remédio.`;
             falarFeedbackCritico(mensagemVoz);
             return; 
        }

        delete cliquesConfirmacao[id];
        clearTimeout(timeoutLimparCliques);

        registrarDoseEFeedback(id, false);
        
        // Feedback específico para ATRASO (seu pedido)
        return;
    } 

    // C. 3 CLIQUES (Adiantamento)
    cliquesConfirmacao[id] = (cliquesConfirmacao[id] || 0) + 1;
    clearTimeout(timeoutLimparCliques); 

    timeoutLimparCliques = setTimeout(() => {
        delete cliquesConfirmacao[id];
    }, 5000); 

    switch (cliquesConfirmacao[id]) {
        case 1:
            falarFeedbackCritico(`Atenção: Certeza que quer tomar antecipado? Toque mais 2 vezes para registrar a dose.`);
            break;
        case 2:
            falarFeedbackCritico(`Confirme: Toque mais 1 vez para registrar a dose.`);
            break;
        case 3:
            registrarDoseEFeedback(id, false); 
            delete cliquesConfirmacao[id];
            clearTimeout(timeoutLimparCliques);
            return;
            
        default:
            cliquesConfirmacao[id] = 1;
            falarFeedbackCritico(`Atenção: Certeza que quer tomar antecipado? Toque mais 2 vezes para registrar a dose.`);
            break;
    }
}

/// EM: roteiro.js - SUBSTITUA A FUNÇÃO registrarDoseEFeedback INTEIRA
/**
 * NOVO: Sub-função que faz o registro real e o feedback.
 * @param {string} id - ID do medicamento.
 * @param {boolean} veioDaNotificacao - Se for true, usa dados da notificação global.
 */
// EM: roteiro.js - SUBSTITUA A FUNÇÃO registrarDoseEFeedback INTEIRA
function registrarDoseEFeedback(id, veioDaNotificacao) {
    const agora = new Date(); 
    const hojeString = agora.toDateString(); 

    let med = todosMedicamentos.find(m => m.id === id); 
    if (!med) return;

    let horarioRegistrar; 
    let atrasoMinutos;   

    // 1. DADOS INICIAIS
    if (veioDaNotificacao) {
        horarioRegistrar = medicamentoNotificacaoAtual.horario;
        const timestampProgramado = getTimestampProgramado(hojeString, horarioRegistrar);
        const diffMs = agora.getTime() - timestampProgramado;
        atrasoMinutos = Math.floor(diffMs / 60000); 

    } else {
        const horarioRecente = obterHorarioMaisRecente(med); 
        if (!horarioRecente) return;
        horarioRegistrar = horarioRecente.horaString; 
        atrasoMinutos = horarioRecente.minutosAtras; 
    }

    // 2. ATUALIZA REGISTRO
    let registro = med.historico.find(r => 
        r.data === hojeString && 
        r.horario === horarioRegistrar &&
        r.tomado !== true 
    );

    if (registro) {
        registro.tomado = true;
        registro.dataHoraToma = agora.toISOString(); 
        registro.atrasoMinutos = atrasoMinutos;
        registro.avisoVisto = true;
    } else {
        med.historico.push({
            data: hojeString, 
            horario: horarioRegistrar, 
            notificado: (veioDaNotificacao != null),
            tomado: true,
            dataHoraToma: agora.toISOString(), 
            atrasoMinutos: atrasoMinutos       
        });
    }

    // Limpa timers e SALVA NO LOCALSTORAGE (CRÍTICO)
    if (timersDeInsistencia[id]) {
        clearInterval(timersDeInsistencia[id]);
        delete timersDeInsistencia[id];
    }
    localStorage.setItem('medHelperMedicamentos', JSON.stringify(todosMedicamentos));

    // ************ CORREÇÃO CHAVE AQUI ************
    // AGORA LÊ O PRÓXIMO HORÁRIO DEPOIS QUE O HISTÓRICO FOI SALVO
    const proximoHorarioObj = obterProximoHorario(med); 
    // ************ FIM DA CORREÇÃO CHAVE ************

    // Recarrega as listas (IMPORTANTE)
    if (document.getElementById('listaCompletaMedicamentos')) carregarListaMedicamentos('completa');
    if (document.getElementById('listaMedicamentosHome')) carregarListaMedicamentos('home');

    // --- FEEDBACK VISUAL/VOZ ---
    const proximoHorario = proximoHorarioObj.horaString;
    let mensagemPopUp = '';
    let mensagemVoz = '';
    
    const MINUTOS_ATRASO_SUCESSO = 5;

    if (atrasoMinutos > MINUTOS_ATRASO_SUCESSO) {
        mensagemPopUp = `Dose atrasada registrada!`;
        mensagemVoz = `Dose atrasada registrada. Próximo horário: ${proximoHorario}.`;
    } else { 
        if (proximoHorario) {
            mensagemPopUp = `Muito bom! Próxima dose às ${proximoHorario}.`;
            mensagemVoz = `Registrado! ${med.apelido} tomado. Próxima dose às ${proximoHorario}.`;
        } else {
            mensagemPopUp = `Muito bom! Dose registrada.`;
            mensagemVoz = `Registrado! ${med.apelido} tomado.`;
        }
    }
    
    mostrarNotificacaoTemporaria(mensagemPopUp);
    alternarOuvintesTTS(false);

    falarFeedbackCritico(mensagemVoz, () => {
        alternarOuvintesTTS(true);
    });

    medicamentoNotificacaoAtual = null; 
}


// COLE ESTA VERSÃO CORRIGIDA (em roteiro.js)
function registrarMedicamentoPulado() {
    if (!medicamentoNotificacaoAtual) return;

    const { medicamento, horario } = medicamentoNotificacaoAtual;
    const id = medicamento.id;

    const idSoneca = `soneca_${id}_${horario}`;
    localStorage.removeItem(idSoneca);

    // --- CORREÇÃO IMPORTANTE: Limpa o timer de insistência ---
    if (timersDeInsistencia[id]) {
        clearInterval(timersDeInsistencia[id]);
        delete timersDeInsistencia[id];
    }
    // --- FIM DA CORREÇÃO ---

    const agora = new Date();
    const hojeString = agora.toDateString();

    let registro = medicamento.historico.find(r => // <-- CORRIGIDO
        r.data === hojeString && 
        r.horario === horario &&
        (r.tomado === null || r.tomado === true) 
    );

    if (registro) {
        registro.tomado = false;
        registro.dataHoraToma = null;
        registro.atrasoMinutos = null;
        registro.avisoVisto = false; 
    } else {
        medicamento.historico.push({ // <-- CORRIGIDO
            data: hojeString,
            horario: horario,
            notificado: true,
            tomado: false,
            avisoVisto: false
        });
    }

    localStorage.setItem('medHelperMedicamentos', JSON.stringify(todosMedicamentos));

    if (document.getElementById('listaCompletaMedicamentos')) carregarListaMedicamentos('completa');
    if (document.getElementById('listaMedicamentosHome')) carregarListaMedicamentos('home');
    if (document.getElementById('listaAvisos')) carregarAvisos();

    falarTexto(`${medicamento.apelido} pulado.`); // <-- CORRIGIDO

    fecharModaisNotificacao();
}

// --- LÓGICA DE ACESSIBILIDADE ---

/**
 * Configura todos os ouvintes de eventos globais (painel, botões, etc)
 */
function configurarOuvintesGlobais() {
    // Painel de Acessibilidade
    const painel = document.getElementById('painelAcessibilidade');
const btnAbrirPainel = document.getElementById('btnAbrirPainel'); // Procura pelo ID específico

if (painel && btnAbrirPainel) { // Verifica se ambos existem
    btnAbrirPainel.addEventListener('click', () => { // Adiciona o evento SÓ nesse botão
        painel.classList.add('aberto');
        painel.setAttribute('aria-hidden', 'false');
    });
    };

    // É preciso verificar se os elementos existem, pois não estão em todas as páginas
    const btnFecharPainel = document.getElementById('btnFecharPainel');
    if (btnFecharPainel) {
        btnFecharPainel.addEventListener('click', () => {
            painel.classList.remove('aberto');
            painel.setAttribute('aria-hidden', 'true');
        });
    }

    // Botões do Painel
    const toggleModoEscuro = document.getElementById('toggleModoEscuro');
    if (toggleModoEscuro) {
        toggleModoEscuro.addEventListener('change', (e) => {
            document.body.classList.toggle('modo-escuro', e.target.checked);
            localStorage.setItem('medHelperModoEscuro', e.target.checked);
        });
    }
    
    const toggleAltoContraste = document.getElementById('toggleAltoContraste');
    if (toggleAltoContraste) {
        toggleAltoContraste.addEventListener('change', (e) => {
            document.body.classList.toggle('alto-contraste', e.target.checked);
            localStorage.setItem('medHelperAltoContraste', e.target.checked);
        });
    }

    const toggleLeituraMouse = document.getElementById('toggleLeituraMouse');
    if (toggleLeituraMouse) {
        toggleLeituraMouse.addEventListener('change', (e) => {
            localStorage.setItem('medHelperLeituraMouse', e.target.checked);
            alternarOuvintesTTS(e.target.checked);


            if (!e.target.checked) {
                sinteseVoz.cancel(); // Interrompe qualquer fala em andamento
            }
        });
    }

    // NOVA: Botão Ler Página
    const btnLerPagina = document.getElementById('btnLerPagina');
    if (btnLerPagina) {
        btnLerPagina.addEventListener('click', lerPaginaEmVozAlta);
    }

    // MUDANÇA: Visão Simplificada
    const toggleVisaoSimplificada = document.getElementById('toggleVisaoSimplificada');
    if (toggleVisaoSimplificada) {
        toggleVisaoSimplificada.addEventListener('change', (e) => {
            document.body.classList.toggle('visao-simplificada', e.target.checked);
            localStorage.setItem('medHelperVisaoSimplificada', e.target.checked);
        });
    }
    
    const toggleVibracao = document.getElementById('toggleVibracao');
    if (toggleVibracao) {
        toggleVibracao.addEventListener('change', (e) => {
            localStorage.setItem('medHelperVibracao', e.target.checked);
        });
    }

    // Fontes
    const btnFontePequena = document.getElementById('btnFontePequena');
    if (btnFontePequena) {
        btnFontePequena.addEventListener('click', () => {
            document.documentElement.style.fontSize = '14px';
            localStorage.setItem('medHelperFonte', 'pequena');
        });
    }
    const btnFonteNormal = document.getElementById('btnFonteNormal');
    if (btnFonteNormal) {
        btnFonteNormal.addEventListener('click', () => {
            document.documentElement.style.fontSize = '';
            localStorage.setItem('medHelperFonte', 'normal');
        });
    }
    const btnFonteGrande = document.getElementById('btnFonteGrande');
    if (btnFonteGrande) {
        btnFonteGrande.addEventListener('click', () => {
            document.documentElement.style.fontSize = '20px';
            localStorage.setItem('medHelperFonte', 'grande');
        });
    }

    // Som
    const selectSomLembrete = document.getElementById('selectSomLembrete');
    const opcaoSomPersonalizado = document.getElementById('opcaoSomPersonalizado');
    if (selectSomLembrete) {
        selectSomLembrete.addEventListener('change', (e) => {
            localStorage.setItem('medHelperSomLembrete', e.target.value);
            opcaoSomPersonalizado.style.display = (e.target.value === 'personalizado') ? 'block' : 'none';
            tocarSomNotificacao(); // Toca para testar
        });
    }
    const inputSomPersonalizado = document.getElementById('inputSomPersonalizado');
    if (inputSomPersonalizado) {
        inputSomPersonalizado.addEventListener('change', (e) => {
            const arquivo = e.target.files[0];
            if (arquivo) {
               // --- LINHA DA CORREÇÃO ADICIONADA AQUI ---
    localStorage.setItem('medHelperSomNome', arquivo.name); // Salva o nome do arquivo

    const leitor = new FileReader();
                leitor.onload = (evento) => {
                    // Salva o som em Base64 no localStorage
                    localStorage.setItem('medHelperSomPersonalizado', evento.target.result);
                    // Carrega o áudio para teste
                    audioPersonalizado = new Audio(evento.target.result);
                    tocarSomNotificacao();
                };
                leitor.readAsDataURL(arquivo);
            }
        });
    }

    // Botões de Voz
    document.querySelectorAll('.btn-voz').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idInput = e.currentTarget.getAttribute('data-para');
            const inputAlvo = document.getElementById(idInput);
            iniciarReconhecimentoVoz(inputAlvo);
        });
    });

    // Botões de Notificação
   // CÓDIGO PARA SUBSTITUIR (O bloco "Botões de Notificação" em configurarOuvintesGlobais)

    // --- NOVOS BOTÕES DE NOTIFICAÇÃO ---

    // Modal Principal (Azul)
   const btnNotifTomar = document.getElementById('btnNotifTomar');
    if (btnNotifTomar) {
        btnNotifTomar.addEventListener('click', () => {
            if (medicamentoNotificacaoAtual) {
                // Chama a nova sub-função (registro imediato)
                registrarDoseEFeedback(medicamentoNotificacaoAtual.medicamento.id, true);
                fecharModaisNotificacao();
            }
        });
    }
    const btnNotifPular = document.getElementById('btnNotifPular');
    if (btnNotifPular) {
        btnNotifPular.addEventListener('click', () => {
            if (medicamentoNotificacaoAtual) {
                registrarMedicamentoPulado(); // A função agora pega os dados da variável global
            }
        });
    }

    const btnNotifAdiar30m = document.getElementById('btnNotifAdiar30m');
    if (btnNotifAdiar30m) {
        btnNotifAdiar30m.addEventListener('click', () => {
            agendarAdiantamento(30); // Adia 30 minutos
        });
    }

    const btnNotifAdiar1h = document.getElementById('btnNotifAdiar1h');
    if (btnNotifAdiar1h) {
        btnNotifAdiar1h.addEventListener('click', () => {
            agendarAdiantamento(60); // Adia 60 minutos
        });
    }

     // COLE DENTRO DE configurarOuvintesGlobais (em roteiro.js)
// ... (logo após os listeners dos botões Adiar 30m e Adiar 1h)

    // --- NOVOS BOTÕES DE FECHAR MODAL (X) ---
    // Esta função aplica a lógica de "soneca de 10 min"
    // COLE DENTRO DE configurarOuvintesGlobais (em roteiro.js)
// ... (logo após os listeners dos botões Adiar 30m e Adiar 1h)

    // --- NOVOS BOTÕES DE FECHAR MODAL (X) ---
    // Esta função aplica a lógica de "soneca de 10 min"
    const logicaFecharModalComSoneca = () => {
        if (medicamentoNotificacaoAtual) {
            const { medicamento, horario } = medicamentoNotificacaoAtual;
            // Define a soneca por 10 minutos (600.000 ms)
            const tempoFinalSoneca = Date.now() + 600000; 
            const idSoneca = `soneca_${medicamento.id}_${horario}`;
            localStorage.setItem(idSoneca, tempoFinalSoneca);
            console.log(`Soneca de 10min ativada para ${medicamento.apelido} via botão 'X'.`);
        }
        fecharModaisNotificacao();
    };

    const btnFecharModalLembrete = document.getElementById('btnFecharModalLembrete');
    if (btnFecharModalLembrete) {
        btnFecharModalLembrete.addEventListener('click', logicaFecharModalComSoneca);
    }



    // Modal de Atraso (Vermelho)
    const btnAtrasoAdiar30m = document.getElementById('btnAtrasoAdiar30m');
    if (btnAtrasoAdiar30m) {
        btnAtrasoAdiar30m.addEventListener('click', () => {
            agendarAdiantamento(30);
        });
    }

    const btnAtrasoAdiar1h = document.getElementById('btnAtrasoAdiar1h');
    if (btnAtrasoAdiar1h) {
        btnAtrasoAdiar1h.addEventListener('click', () => {
            agendarAdiantamento(60);
        });
    }

   
    
    


    // CÓDIGO PARA SUBSTITUIR

const btnAtrasoOk = document.getElementById('btnAtrasoOk');
if (btnAtrasoOk) {
    btnAtrasoOk.addEventListener('click', () => {
        // --- CORREÇÃO DA SONECA DE 10 MINUTOS ---
        if (medicamentoNotificacaoAtual) {
            const { medicamento, horario } = medicamentoNotificacaoAtual;
            // Define a soneca por 10 minutos (600.000 ms)
            const tempoFinalSoneca = Date.now() + 600000; 
            const idSoneca = `soneca_${medicamento.id}_${horario}`;
            localStorage.setItem(idSoneca, tempoFinalSoneca);
        }
        // --- FIM DA CORREÇÃO ---

        // Fecha o modal
        fecharModaisNotificacao();
    });
}

    // Botão "Pular" do Modal Principal (que agora está na função de pular)
    const btnNotifPularPrincipal = document.getElementById('btnNotifPular'); 
    if(btnNotifPularPrincipal) {
        btnNotifPularPrincipal.addEventListener('click', registrarMedicamentoPulado);
    }
    // Botão Limpar Dados (Página Config)
    const btnLimparDados = document.getElementById('btnLimparDados');
    if(btnLimparDados) {
        btnLimparDados.addEventListener('click', () => {
            if (confirm('TEM CERTEZA? Isso vai apagar TODOS os seus dados (nome e remédios) e recomeçar o aplicativo.')) {
                localStorage.clear();
                window.location.href = 'index.html';
            }
        });
    }

    // Input de Nome (Página Config)
    const inputNomeConfig = document.getElementById('inputNomeConfig');
    if (inputNomeConfig) {
        inputNomeConfig.addEventListener('change', (e) => {
            nomeUsuario = e.target.value.trim();
            localStorage.setItem('medHelperNomeUsuario', nomeUsuario);
            atualizarSaudacao();
            falarTexto("Nome atualizado.");
        });
    }
}

/**
 * Carrega as configurações salvas do localStorage e as aplica
 */
function carregarConfiguracoesSalvas() {
    // Modo Escuro
    if (localStorage.getItem('medHelperModoEscuro') === 'true') {
        document.body.classList.add('modo-escuro');
        const toggle = document.getElementById('toggleModoEscuro');
        if (toggle) toggle.checked = true;
    }
    // Alto Contraste
    if (localStorage.getItem('medHelperAltoContraste') === 'true') {
        document.body.classList.add('alto-contraste');
        const toggle = document.getElementById('toggleAltoContraste');
        if (toggle) toggle.checked = true;
    }
    // Leitura ao Mouse/Dedo
    if (localStorage.getItem('medHelperLeituraMouse') === 'true') {
        const toggle = document.getElementById('toggleLeituraMouse');
        if (toggle) toggle.checked = true;
    }
    // Visão Simplificada
    if (localStorage.getItem('medHelperVisaoSimplificada') === 'true') {
        document.body.classList.add('visao-simplificada');
        const toggle = document.getElementById('toggleVisaoSimplificada');
        if (toggle) toggle.checked = true;
    }
    // Vibração
    if (localStorage.getItem('medHelperVibracao') === 'true') {
        const toggle = document.getElementById('toggleVibracao');
        if (toggle) toggle.checked = true;
    }
    // Fonte
    const fonte = localStorage.getItem('medHelperFonte');
    if (fonte === 'pequena') {
        document.documentElement.style.fontSize = '14px';
    } else if (fonte === 'grande') {
        document.documentElement.style.fontSize = '20px';
    } else {
        document.documentElement.style.fontSize = '';
    }
    
    // Som
  const som = localStorage.getItem('medHelperSomLembrete');
    if (som) {
    // Esta parte do código SÓ vai funcionar na página de configurações (o que está correto),
    // pois só lá existe o 'selectSomLembrete'.
    const select = document.getElementById('selectSomLembrete');
    if (select) {
        select.value = som;
        if (som === 'personalizado') {
            const opcaoSom = document.getElementById('opcaoSomPersonalizado');
            if (opcaoSom) opcaoSom.style.display = 'block';
        }
    }

    // --- CORREÇÃO AQUI ---
    // Esta parte agora vai rodar em TODAS as páginas, garantindo que o som seja carregado.
    // Se a preferência salva for 'personalizado', ele carrega o áudio na memória.
   if (som === 'personalizado') {
    const opcaoSom = document.getElementById('opcaoSomPersonalizado');
    if (opcaoSom) opcaoSom.style.display = 'block';

    const somBase64 = localStorage.getItem('medHelperSomPersonalizado');
    if (somBase64) {
        audioPersonalizado = new Audio(somBase64);

        // --- LÓGICA ADICIONADA AQUI ---
        // Exibe o nome do arquivo que já está salvo
        const nomeArquivoSalvo = localStorage.getItem('medHelperSomNome');
        const elNomeSom = document.getElementById('nomeSomSalvo');
        if (nomeArquivoSalvo && elNomeSom) {
            elNomeSom.textContent = nomeArquivoSalvo;
        }
    }
}
    }
}


// --- FUNÇÕES DE SÍNTESE DE VOZ (TTS) ---

/**
 * NOVA: Fala um texto de feedback importante, IGNORANDO a configuração do usuário.
 * Usado para confirmações críticas.
 */
function falarFeedbackCritico(texto, aoTerminar = null) {
    if (sinteseVoz && texto) {
        sinteseVoz.cancel(); // Cancela qualquer fala pendente

        // Adiciona um delay de 50ms para evitar race condition do navegador
        setTimeout(() => {
            const enunciado = new SpeechSynthesisUtterance(texto);
            enunciado.lang = 'pt-BR';
            enunciado.rate = 1.0;

            // Se uma função de "callback" foi passada, nós a executamos no final.
            if (aoTerminar && typeof aoTerminar === 'function') {
                enunciado.onend = aoTerminar;
            }

            sinteseVoz.speak(enunciado);
        }, 50); // 50ms de atraso
    }
}



/**
 * Fala um texto em voz alta, cancelando falas anteriores.
 */
function falarTexto(texto) {
    if (localStorage.getItem('medHelperLeituraMouse') === 'true' && sinteseVoz && texto) {
        sinteseVoz.cancel(); // Cancela qualquer fala pendente
        const enunciado = new SpeechSynthesisUtterance(texto);
        enunciado.lang = 'pt-BR';
        enunciado.rate = 1.0;
        sinteseVoz.speak(enunciado);
    }
}

/**
 * Lógica para falar o texto de um elemento ao passar o mouse/dedo
 */
function lidarComLeituraMouse(e) {

    const alvo = e.target;
    if (alvo.classList.contains('pagina') || alvo.classList.contains('mensagem-boasvindas') || alvo.classList.contains('assistente-container') || alvo.classList.contains('lista-medicamentos') || alvo.classList.contains('nav-inferior')) {
        return; // Não faz nada para evitar ler a página inteira
    }

    // 1. Limpa qualquer fala que estava agendada para acontecer.
    clearTimeout(timeoutFala);

    let elemento = e.target;
    let texto = null;

    // Tenta achar o texto mais relevante subindo na hierarquia
    for (let i = 0; i < 3; i++) {
        if (!elemento) break;
        texto = elemento.getAttribute('aria-label') || elemento.textContent.trim();
        if (texto) break;
        elemento = elemento.parentElement;
    }

    // Se não encontrou texto, ou é um texto muito curto, ou é o mesmo que acabou de falar, não faz nada.
    if (!texto || texto.length <= 2 || texto === ultimoTextoFalado) {
        return;
    }

    // Esta é a função que efetivamente vai falar o texto
    const executarFala = () => {
        ultimoTextoFalado = texto;
        falarTexto(texto);
        // Depois de um tempo, permite que o mesmo texto seja falado novamente se o usuário interagir de novo
        setTimeout(() => { ultimoTextoFalado = ''; }, 1500); 
    };

    // 2. **A LÓGICA INTELIGENTE ESTÁ AQUI**
    if (e.type === 'mouseover') {
        // Se o evento foi do MOUSE (computador), agenda a fala para daqui a 400ms.
        // Se o mouse sair antes, a linha 1 (clearTimeout) vai cancelar esta ação.
        timeoutFala = setTimeout(executarFala, 400);
    } else {
        // Se o evento foi de TOQUE (celular), executa a fala IMEDIATAMENTE.
        executarFala();
    }
}

/**
 * Adiciona ou remove os ouvintes de "ler ao passar o mouse/dedo"
 */
function alternarOuvintesTTS(ligar) {
    if (ligar) {
        document.body.addEventListener('mouseover', lidarComLeituraMouse);
        document.body.addEventListener('touchstart', lidarComLeituraMouse, { passive: true });
    } else {
        document.body.removeEventListener('mouseover', lidarComLeituraMouse);
        document.body.removeEventListener('touchstart', lidarComLeituraMouse);
    }
}

/**
 * NOVA: Lê todo o conteúdo textual relevante da página atual
 */
function lerPaginaEmVozAlta() {
    sinteseVoz.cancel(); // Para qualquer fala
    
    // Define quais seletores queremos ler, em ordem
    const seletores = [
        '.etapa.ativa .etapa-titulo', // Título da etapa do assistente
        '.etapa.ativa .etapa-texto', // Texto da etapa do assistente
        'header h1', // Título da página
        '.saudacao-usuario', // Saudação
        '.proximo-medicamento h2', // "Próximo Medicamento"
        '#infoProximoMedicamento p', // Detalhes do próximo
        '.cartao-medicamento .nome-medicamento', // Nomes dos remédios na lista
        '.cartao-medicamento .detalhes-medicamento', // Detalhes dos remédios
        '.formulario-container h2',
        '.formulario-container p',
        '.formulario-container ul', // Título do formulário
        '.grupo-formulario label' // Labels dos formulários
    ];

    let textosParaFalar = [];

    document.querySelectorAll(seletores.join(', ')).forEach(el => {
        // Pega o texto se o elemento estiver visível
        if (el.offsetParent !== null && el.textContent) {
            textosParaFalar.push(el.textContent.trim());
        }
    });

    if (textosParaFalar.length > 0) {
        // Une os textos com uma pequena pausa
        const textoCompleto = textosParaFalar.join('. ... ');
        const enunciado = new SpeechSynthesisUtterance(textoCompleto);
        enunciado.lang = 'pt-BR';
        enunciado.rate = 1.0;
        sinteseVoz.speak(enunciado);
    } else {
        falarTexto("Nenhum texto principal encontrado na página.");
    }
}

/**
 * Lê o conteúdo da etapa atual do assistente
 */
function lerEtapaAtualEmVozAlta(aoTerminar = null) {
    const etapaAtiva = document.querySelector('.etapa.ativa');
    if (!etapaAtiva) return;

    const titulo = etapaAtiva.querySelector('.etapa-titulo');
    const texto = etapaAtiva.querySelector('.etapa-texto');

    let textoCompleto = '';
    if (titulo && titulo.textContent) textoCompleto += titulo.textContent.trim() + '. ';
    if (texto && texto.textContent) textoCompleto += texto.textContent.trim();

    if (textoCompleto) {
        // Usa a função que sabe como executar algo no final
        falarFeedbackCritico(textoCompleto, aoTerminar);
    }
}


// --- FUNÇÕES DE ÁUDIO E VOZ ---

function tocarSomNotificacao() {
    const som = localStorage.getItem('medHelperSomLembrete') || 'sino';
    
    if (som === 'personalizado' && audioPersonalizado) {
        audioPersonalizado.play();
        return;
    }
    
    if (som === 'vibracao') {
         if (localStorage.getItem('medHelperVibracao') === 'true' && 'vibrate' in navigator) {
            navigator.vibrate(200);
        }
        return;
    }

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (!audioContext) return; 

    const ganho = audioContext.createGain();
    ganho.connect(audioContext.destination);
    
    if (som === 'melodia') {
        tocarMelodia(audioContext, ganho);
        return;
    }

    const oscilador = audioContext.createOscillator();
    oscilador.connect(ganho);

    switch(som) {
        case 'sino':
            oscilador.type = 'sine';
            oscilador.frequency.value = 800;
            break;
        case 'campainha':
            oscilador.type = 'triangle';
            oscilador.frequency.value = 1000;
            break;
        case 'bipe':
            oscilador.type = 'square';
            oscilador.frequency.value = 600;
            break;
        default:
            oscilador.type = 'sine';
            oscilador.frequency.value = 800;
    }
    
    ganho.gain.value = 0.5;
    
    oscilador.start();
    ganho.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
    oscilador.stop(audioContext.currentTime + 0.5);
}

function tocarMelodia(audioContext, ganho) {
    const notas = [523.25, 659.25, 783.99]; // C5, E5, G5
    let tempo = audioContext.currentTime;
    
    notas.forEach((frequencia, index) => {
        const oscilador = audioContext.createOscillator();
        oscilador.connect(ganho);
        oscilador.type = 'sine';
        oscilador.frequency.value = frequencia;
        
        oscilador.start(tempo + index * 0.2);
        oscilador.stop(tempo + index * 0.2 + 0.15);
    });
}

function iniciarReconhecimentoVoz(inputAlvo) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert('Seu navegador não suporta reconhecimento de voz.');
        return;
    }
    
    const reconhecimento = new SpeechRecognition();
    reconhecimento.lang = 'pt-BR';
    reconhecimento.interimResults = false;
    reconhecimento.maxAlternatives = 1;
    
    reconhecimento.start();
    falarTexto("Ouvindo..."); // Feedback
    
    reconhecimento.onresult = (evento) => {
        const transcricao = evento.results[0][0].transcript;
        inputAlvo.value = transcricao;
    };
    
    reconhecimento.onerror = (evento) => {
        console.error('Erro no reconhecimento de voz:', evento.error);
        falarTexto("Não consegui entender. Tente novamente.");
    };
}

function configurarPaginaEditar() {
    // Pega o ID do remédio da URL (ex: editar.html?id=12345)
    const urlParams = new URLSearchParams(window.location.search);
    const medId = urlParams.get('id');

    if (!medId) {
        alert("ID do medicamento não encontrado!");
        window.location.href = 'medicamentos.html';
        return;
    }

    // Encontra o medicamento no nosso array 'todosMedicamentos'
    const medicamento = todosMedicamentos.find(m => m.id === medId);

    if (!medicamento) {
        alert("Medicamento não encontrado!");
        window.location.href = 'medicamentos.html';
        return;
    }

    // Preenche o formulário com os dados do remédio
    preencherFormularioEdicao(medicamento);

    // Adiciona a função ao botão "Salvar Alterações"
    document.getElementById('btnSalvarAlteracoes').addEventListener('click', () => {
        salvarAlteracoesMedicamento(medId);
    });

    // Adiciona a função ao botão "Excluir Remédio"
    document.getElementById('btnExcluirMedicamento').addEventListener('click', () => {
        if (confirm(`Tem certeza que deseja excluir o remédio "${medicamento.apelido}"?`)) {
            deletarMedicamento(medId);
            // A função deletarMedicamento já atualiza a lista, então só precisamos voltar
            window.location.href = 'medicamentos.html';
        }
    });

    // Adiciona a lógica de clique para os botões de intervalo na tela de edição
    document.querySelectorAll('.btn-opcao-intervalo').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove a classe 'ativo' de todos os botões de intervalo
            document.querySelectorAll('.btn-opcao-intervalo').forEach(b => b.classList.remove('ativo'));
            // Adiciona a classe 'ativo' apenas no botão que foi clicado
            e.currentTarget.classList.add('ativo');
        });
    });


    // --- LÓGICA PARA ORIENTAÇÕES MÉDICAS (Assistente) ---
    const checkOrientacao = document.getElementById('checkOrientacaoMedica');
    const campoOrientacao = document.getElementById('campoOrientacaoMedica');
    const inputOrientacao = document.getElementById('inputOrientacaoMedica');

    if (checkOrientacao && campoOrientacao && inputOrientacao) {
        checkOrientacao.addEventListener('change', (e) => {
            if (e.target.checked) {
                campoOrientacao.style.display = 'block';
                // FALA A INSTRUÇÃO QUANDO O CAMPO APARECE
                falarFeedbackCritico("Coloque exatamente o que seu médico te orientou.");
                inputOrientacao.focus(); // Coloca o cursor no campo de texto
            } else {
                campoOrientacao.style.display = 'none';
                inputOrientacao.value = ''; // Limpa o campo se desmarcar
            }
        });
    }


    // --- FIM DA CORREÇÃO ---
} // Este '}' fecha a função configurarPaginaEditar


function preencherFormularioEdicao(medicamento) {
    document.getElementById('inputNomeRemedio').value = medicamento.nome || '';
    document.getElementById('inputApelidoRemedio').value = medicamento.apelido || '';
    document.getElementById('inputCorRemedio').value = medicamento.cor || ''; // <-- ADICIONE ESTA LINHA
    document.getElementById('inputDose').value = medicamento.dose || '';
    document.getElementById('inputDuracao').value = medicamento.duracao || '';

    // Para o horário e intervalo, precisamos de um pouco mais de lógica
    if (medicamento.horarios && medicamento.horarios.length > 0) {
        document.getElementById('inputPrimeiroHorario').value = medicamento.horarios[0];
    }

    // Simula o clique no botão de intervalo correto
   if (medicamento.horarios && medicamento.horarios.length > 1) {
    // Ordena os horários para garantir que a gente pegue os dois primeiros em sequência
    const horariosOrdenados = [...medicamento.horarios].sort();
    const h1 = parseInt(horariosOrdenados[0].split(':')[0]);
    const h2 = parseInt(horariosOrdenados[1].split(':')[0]);

    let intervalo = h2 - h1;

    // Se o intervalo for negativo, significa que pulou a meia-noite (ex: de 22h para 06h)
    if (intervalo < 0) {
        intervalo = intervalo + 24;
    }

    const btnIntervalo = document.querySelector(`.btn-opcao-intervalo[data-intervalo="${intervalo}"]`);
    if (btnIntervalo) {
        btnIntervalo.classList.add('ativo');
    }
} else if (medicamento.horarios && medicamento.horarios.length === 1) {
    // Se só tem um horário, o intervalo é de 24h
    const btn24h = document.querySelector('.btn-opcao-intervalo[data-intervalo="24"]');
    if (btn24h) {
        btn24h.classList.add('ativo');
    }
}

// Preenche os campos de Orientação Médica
    const checkOrientacao = document.getElementById('checkOrientacaoMedica');
    const campoOrientacao = document.getElementById('campoOrientacaoMedica');
    const inputOrientacao = document.getElementById('inputOrientacaoMedica');

    if (checkOrientacao && campoOrientacao && inputOrientacao) {
        if (medicamento.temOrientacao) {
            checkOrientacao.checked = true;
            campoOrientacao.style.display = 'block';
            inputOrientacao.value = medicamento.textoOrientacao || '';
        } else {
            checkOrientacao.checked = false;
            campoOrientacao.style.display = 'none';
            inputOrientacao.value = '';
        }
    }
}

function salvarAlteracoesMedicamento(medId) {
    // Encontra o índice do remédio que estamos editando
    const medIndex = todosMedicamentos.findIndex(m => m.id === medId);
    if (medIndex === -1) {
        alert("Erro: não foi possível encontrar o medicamento para salvar.");
        return;
    }

    // Pega os novos valores do formulário
    const novoNome = document.getElementById('inputNomeRemedio').value;
    const novoApelido = document.getElementById('inputApelidoRemedio').value;
    const novaCor = document.getElementById('inputCorRemedio').value; // <-- ADICIONE ESTA LINHA
    const novaDose = document.getElementById('inputDose').value;
    const novaDuracao = document.getElementById('inputDuracao').value;
    const novoPrimeiroHorario = document.getElementById('inputPrimeiroHorario').value;

    const btnIntervaloAtivo = document.querySelector('#pagina-editar .btn-opcao-intervalo.ativo');
const novoIntervalo = btnIntervaloAtivo ? parseInt(btnIntervaloAtivo.getAttribute('data-intervalo')) : null;

    

    // Validação dos campos
    if (!novoNome || !novoApelido || !novaDose || !novoPrimeiroHorario || !novoIntervalo) {
        alert("Por favor, preencha todos os campos obrigatórios: Nome, Apelido, Dose, Primeiro Horário e Intervalo.");
        return;
    }

    // --- CORREÇÃO PRINCIPAL AQUI ---
    // Em vez de modificar o objeto antigo, criamos um novo objeto atualizado.
    // Isso é mais seguro e evita erros de referência.

    const temOrientacao = document.getElementById('checkOrientacaoMedica').checked;
const textoOrientacao = temOrientacao ? document.getElementById('inputOrientacaoMedica').value : null;
    const medicamentoAtualizado = {
        ...todosMedicamentos[medIndex], // Copia todas as propriedades antigas (como id, imagem, etc.)
        nome: novoNome,
        apelido: novoApelido,
        cor: novaCor || null,
        dose: novaDose,
        duracao: novaDuracao || null,
        horarios: calcularHorarios(novoIntervalo, novoPrimeiroHorario),// Recalcula os horários com os novos dados
        temOrientacao: temOrientacao,
        textoOrientacao: textoOrientacao 
    };

    // Substitui o objeto antigo pelo novo objeto atualizado no array
    todosMedicamentos[medIndex] = medicamentoAtualizado;

    // Salva o array completo e atualizado no localStorage
    localStorage.setItem('medHelperMedicamentos', JSON.stringify(todosMedicamentos));

    // Avisa o usuário e volta para a lista
    alert("Medicamento atualizado com sucesso!");
    window.location.href = 'medicamentos.html';
}


function configurarPaginaLogin() {
    console.log("Configurando página de login...");
    const btnSemConta = document.getElementById('btnEntrarSemConta');
    const btnComContaDemo = document.getElementById('btnEntrarComContaDemo');
    const campoSenhaDemo = document.getElementById('campoSenhaDemo');
    const inputSenhaDemo = document.getElementById('inputSenhaDemo');
    const btnConfirmarSenha = document.getElementById('btnConfirmarSenhaDemo');
    const btnCancelarSenha = document.getElementById('btnCancelarSenhaDemo');

    // Voz explicando as opções ao carregar
    setTimeout(() => {
        falarFeedbackCritico("Para usar o aplicativo como visitante, toque no ícone de boneco, para entrar sem conta. Para ver a demonstração da conta de cuidador, toque no ícone de cadeado, para entrar com senha");
    }, 500);

    // COLE ESTA VERSÃO CORRIGIDA (em roteiro.js, dentro de configurarPaginaLogin)
if (btnSemConta) {
    btnSemConta.addEventListener('click', () => {
        console.log("Botão 'Sem Conta' clicado.");

        const nomeUsuarioLocal = localStorage.getItem('medHelperNomeUsuario');
        const termosAceitos = localStorage.getItem('medHelperTermosAceitos') === 'true';

        if (nomeUsuarioLocal) {
            // Caso 1: Usuário antigo. Já tem nome, vai direto pra home.
            window.location.href = 'home.html';
        } else if (!termosAceitos) {
            // Caso 2: Usuário novo. Não aceitou os termos. Vai para termos.html.
            window.location.href = 'termos.html';
        } else {
            // Caso 3: Usuário novo, já aceitou os termos (ex: saiu no meio do cadastro).
            // Vai direto para boas-vindas.
            window.location.href = 'boasvindas.html';
        }
    });
}

    if (btnComContaDemo) {
        btnComContaDemo.addEventListener('click', () => {
            console.log("Botão 'Com Conta DEMO' clicado.");
            campoSenhaDemo.style.display = 'block'; // Mostra o campo de senha
            falarFeedbackCritico("Por favor, digite a palavra chave da demonstração.");
            inputSenhaDemo.focus();
        });
    }

    if (btnConfirmarSenha) {
        btnConfirmarSenha.addEventListener('click', () => {
            console.log("Botão 'Confirmar Senha' clicado.");
            // Defina sua palavra chave universal aqui!
            const palavraChaveCorreta = "feira2025"; // <<< MUDE AQUI SE QUISER

            if (inputSenhaDemo.value === palavraChaveCorreta) {
                console.log("Palavra chave correta!");
                // Define um nome de usuário fixo para a demo
                nomeUsuario = "Cuidador Demonstração";
                localStorage.setItem('medHelperNomeUsuario', nomeUsuario);
                // Marca que a saudação JÁ FOI FEITA para essa conta demo
                localStorage.setItem('medHelperSaudacaoFeita', 'true');
                // --- NOVO CÓDIGO AQUI ---
    // Cria os dados de exemplo (um remédio)
    console.log("Carregando dados de exemplo para a DEMO...");
    const remedioExemplo = {
        id: "demo123", // Um ID fixo para o exemplo
        nome: "Dipirona Monoidratada",
        apelido: "Remédio da Dor",
        dose: "1 comprimido",
        horarios: ["08:00", "16:00"], // Exemplo: 8 em 8h, começando às 8h
        imagemUrl: null, // Pode colocar uma URL de imagem aqui se quiser
        duracao: "7", // Exemplo: tratamento de 7 dias
        dataInicio: new Date().toISOString(), // Começa hoje
        dataFim: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Termina daqui a 7 dias
        historico: [], // Começa com histórico limpo
        temOrientacao: true, // Exemplo com orientação
        textoOrientacao: "Tomar após as refeições. Evitar exposição ao sol." // Texto da orientação
    };

    const remedioExemplo2 = { 
        id: "demo456", // NOVO ID ÚNICO
        nome: "Losartana Potássica",
        apelido: "Remédio da Pressão",
        dose: "50mg - 1 comp.",
        horarios: ["09:00"], // Exemplo: 1 vez ao dia às 9h
        imagemUrl: null,
        duracao: null, // Exemplo: Uso contínuo
        dataInicio: new Date().toISOString(),
        dataFim: null,
        historico: [],
        temOrientacao: false, // Exemplo sem orientação
        textoOrientacao: null
    };

    // Define a lista de medicamentos APENAS com o exemplo
    todosMedicamentos = [remedioExemplo, remedioExemplo2];
    // Salva essa lista de exemplo no localStorage, SOBRESCREVENDO o que estava lá
    localStorage.setItem('medHelperMedicamentos', JSON.stringify(todosMedicamentos));
    console.log("Dados de exemplo carregados:", todosMedicamentos);
    // --- FIM DO NOVO CÓDIGO ---

    // Redireciona para a home
    window.location.href = 'home.html';
            } else {
                console.log("Palavra chave incorreta.");
                falarFeedbackCritico("Palavra chave incorreta. Tente novamente.");
                alert("Palavra chave incorreta!");
                inputSenhaDemo.value = '';
                inputSenhaDemo.focus();
            }
        });
    }

    // Permite confirmar com Enter
     if (inputSenhaDemo) {
        inputSenhaDemo.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
               btnConfirmarSenha.click();
            }
        });
     }

    if (btnCancelarSenha) {
        btnCancelarSenha.addEventListener('click', () => {
            console.log("Botão 'Cancelar Senha' clicado.");
            campoSenhaDemo.style.display = 'none'; // Esconde o campo
            inputSenhaDemo.value = '';
        });
    }
}

// COLE ESTA NOVA FUNÇÃO (em roteiro.js)


// CÓDIGO PARA ADICIONAR NO FINAL DO JS

function configurarPaginaAvisos() {
    console.log("Configurando página de Avisos...");
    carregarAvisos();

    const btnMarcarVisto = document.getElementById('btnMarcarVisto');
    if (btnMarcarVisto) {
        btnMarcarVisto.addEventListener('click', () => {
            marcarAvisosComoVistos();
        });
    }
}

// CÓDIGO PARA SUBSTITUIR (A função carregarAvisos inteira)

// CÓDIGO PARA SUBSTITUIR (A função carregarAvisos inteira)

// CÓDIGO PARA SUBSTITUIR (A função carregarAvisos inteira)

// CÓDIGO PARA SUBSTITUIR (A função carregarAvisos inteira)

// COLE ESTA VERSÃO CORRIGIDA (em roteiro.js)
function carregarAvisos() {
    const listaAvisosEl = document.getElementById('listaAvisos');
    const semAvisosEl = document.getElementById('semAvisos');
    const btnMarcarVisto = document.getElementById('btnMarcarVisto'); 
    if (!listaAvisosEl || !semAvisosEl || !btnMarcarVisto) return;

    // Limpa a lista para evitar duplicatas
    listaAvisosEl.querySelectorAll('.aviso-item').forEach(item => item.remove());

    let avisosHtml = '';
    let temAvisosNaoVistos = false;
    const agora = new Date();
    const limiteDias = 7; // Limite de 7 dias para trás
    const limiteAtrasoGrave = 30; // Nosso novo limite de 30 minutos

    // --- LÓGICA DO AVISO "AO VIVO" (O que já tínhamos) ---
    // Mostra remédios que estão atrasados AGORA
    todosMedicamentos.forEach(med => {
        if (!med.historico) return;
        med.historico.forEach(reg => {
            if (reg.notificado === true && reg.tomado === null) {
                const timestampProgramado = getTimestampProgramado(reg.data, reg.horario);
                const diffMs = agora.getTime() - timestampProgramado;
                const diffMin = Math.floor(diffMs / 60000);

                const idSoneca = `soneca_${med.id}_${reg.horario}`;
                const tempoSoneca = localStorage.getItem(idSoneca);

                if (diffMin > 0) {
                let mensagem = `⏰ ${med.apelido} - Está há **${diffMin} minutos ATRASADO**.`;
                avisosHtml += `
                        <div class="aviso-item atraso">
                            <div class="aviso-texto">${mensagem}</div>
                        </div>
                    `;
                    temAvisosNaoVistos = true; 
                }
            }
        });
    });
    // --- FIM DA LÓGICA "AO VIVO" ---

    // --- LÓGICA DOS AVISOS PASSADOS (PULADOS E ATRASADOS) ---
    // Mostra problemas que já aconteceram nos últimos 7 dias
    todosMedicamentos.forEach(med => {
        if (!med.historico || med.historico.length === 0) return;

        med.historico.filter(reg => {
            const dataRegistro = new Date(reg.data);
            const diffTempo = agora.getTime() - dataRegistro.getTime();
            const diffDias = diffTempo / (1000 * 3600 * 24);
            
            // --- CONDIÇÃO MODIFICADA AQUI ---
            // Pega doses PULADAS (tomado === false)
            // OU doses TOMADAS (tomado === true) MAS com atraso >= 30 min
            return diffDias <= limiteDias && (
                reg.tomado === false || 
                (reg.tomado === true && reg.atrasoMinutos >= limiteAtrasoGrave)
            );
        })
        .sort((a, b) => {
            // Ordena por data (mais recente primeiro)
            const dataA = reg.dataHoraToma ? new Date(reg.dataHoraToma) : new Date(reg.data);
            const dataB = reg.dataHoraToma ? new Date(reg.dataHoraToma) : new Date(reg.data);
            return dataB.getTime() - dataA.getTime();
        })
        .forEach(reg => {
            let mensagem = '';
            let tipo = '';
            let classeVisto = reg.avisoVisto ? 'visto' : ''; 
            let dataHora = new Date(reg.data).toLocaleDateString('pt-BR');

            if (reg.tomado === false) {
                // Caso 1: Dose PULADA (vermelho)
                mensagem = `❌ ${med.apelido} - Dose das ${reg.horario} foi PULADA em ${dataHora}.`;
                tipo = 'pulado'; // Classe CSS vermelha
                if (!reg.avisoVisto) temAvisosNaoVistos = true; 

            } else if (reg.tomado === true && reg.atrasoMinutos >= limiteAtrasoGrave) {
                // Caso 2: Dose ATRASADA (amarelo) - NOSSO NOVO CÓDIGO
                mensagem = `⚠️ ${med.apelido} - Dose das ${reg.horario} atrasou ${reg.atrasoMinutos} min em ${dataHora}.`;
                tipo = 'atraso'; // Classe CSS amarela
                if (!reg.avisoVisto) temAvisosNaoVistos = true;
            }

            if (mensagem) {
                avisosHtml += `
                    <div class="aviso-item ${tipo} ${classeVisto}">
                        <div class="aviso-texto">${mensagem}</div>
                    </div>
                `;
            }
        });
    });
    // --- FIM DA LÓGICA PASSADA ---

    // Renderiza o HTML na página
    if (avisosHtml) {
        listaAvisosEl.insertAdjacentHTML('afterbegin', avisosHtml);
        semAvisosEl.style.display = 'none';
        btnMarcarVisto.style.display = temAvisosNaoVistos ? 'block' : 'none';
    } else {
        semAvisosEl.style.display = 'block';
        btnMarcarVisto.style.display = 'none';
    }
}
// CÓDIGO PARA ADICIONAR (NO FINAL DO JS)

function marcarAvisosComoVistos() {
    console.log("Marcando avisos como vistos...");
    const hoje = new Date();
    const limiteDias = 7;
    let algumaMudancaFeita = false;

    todosMedicamentos.forEach(med => {
        if (!med.historico || med.historico.length === 0) return;

        med.historico.forEach(reg => {
            // Encontra os registros problemáticos dos últimos 7 dias que AINDA NÃO foram vistos
            const dataRegistro = new Date(reg.data);
            const diffTempo = hoje.getTime() - dataRegistro.getTime();
            const diffDias = diffTempo / (1000 * 3600 * 24);

            if (diffDias <= limiteDias && (reg.tomado === false || reg.atrasoMinutos > 15) && !reg.avisoVisto) {
                reg.avisoVisto = true; // Marca como visto
                algumaMudancaFeita = true;
            }
        });
    });

    if (algumaMudancaFeita) {
        console.log("Salvando alterações no localStorage...");
        localStorage.setItem('medHelperMedicamentos', JSON.stringify(todosMedicamentos));
        falarFeedbackCritico("Avisos marcados como vistos.");
        carregarAvisos(); // Recarrega a lista para aplicar o estilo visual
    } else {
        falarFeedbackCritico("Nenhum aviso novo para marcar.");
    }
}

// CÓDIGO PARA ADICIONAR NO FINAL DO JS

function configurarPaginaHistorico() {
    console.log("Configurando página de Histórico...");
    carregarHistorico();

    const btnGerarRelatorio = document.getElementById('btnGerarRelatorio');
    if (btnGerarRelatorio) {
        btnGerarRelatorio.addEventListener('click', () => {
            window.location.href = 'relatorio.html';
        });
    }
}

// CÓDIGO PARA SUBSTITUIR (A função carregarHistorico inteira)

function carregarHistorico() {
    const listaHistoricoEl = document.getElementById('listaHistorico');
    const semHistoricoEl = document.getElementById('semHistorico');
    if (!listaHistoricoEl || !semHistoricoEl) return;

    let todosRegistros = [];

    // 1. Coleta todos os registros de todos os medicamentos
    todosMedicamentos.forEach(med => {
        if (med.historico && med.historico.length > 0) {
            med.historico.forEach(reg => {
                todosRegistros.push({
                    ...reg,
                    apelido: med.apelido,
                    horarioProgramado: reg.horario
                });
            });
        }
    });

    if (todosRegistros.length === 0) {
        semHistoricoEl.style.display = 'block';
        listaHistoricoEl.innerHTML = '';
        return;
    }

    semHistoricoEl.style.display = 'none';

    // 2. Ordena todos os registros do mais recente para o mais antigo
    todosRegistros.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    // 3. Agrupa os registros por dia
    const registrosAgrupados = todosRegistros.reduce((grupos, reg) => {
        const data = new Date(reg.data).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
        if (!grupos[data]) {
            grupos[data] = [];
        }
        grupos[data].push(reg);
        return grupos;
    }, {});

    // 4. Monta o HTML
    let historicoHtml = '';
    for (const data in registrosAgrupados) {
        historicoHtml += `<div class="grupo-dia">`;
        historicoHtml += `<h3 class="titulo-dia">${data}</h3>`; 

        registrosAgrupados[data].forEach(reg => {
            let statusIcon = '';
            let statusTexto = '';
            let statusClasse = '';
            let classeCartaoExtra = ''; 

            // --- CORREÇÃO AQUI ---
            // Verifica se o registro é válido para exibição
          // EM: carregarHistorico (roteiro.js) - SUBSTITUA ESTE BLOCO

            if (reg.tomado === true) {
                // Se dataHoraToma não existir (dados antigos), usa o horário programado
             const horaReal = reg.dataHoraToma ? new Date(reg.dataHoraToma).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) : reg.horarioProgramado;
                const atraso = reg.atrasoMinutos || 0; // Pode ser negativo para adiantamento!

                if (atraso > 5) { // É atrasado (mais de 5 min)
                    statusIcon = '⚠️';
                    statusTexto = `Tomou às ${horaReal} (${atraso} min atrasado)`;
                    statusClasse = 'status-atraso';
                    classeCartaoExtra = 'atraso-grave'; 
                } else if (atraso < 0) { // É adiantado
                    const adiantamento = atraso * -1; // Transforma o negativo em positivo para exibição
                    statusIcon = '⏱️';
                    statusTexto = `Tomou às ${horaReal} (${adiantamento} min adiantado)`; 
                    statusClasse = 'status-ok'; // Tratamos adiantamento como pontualidade
                } else { // Pontual (entre 0 e 5 min de atraso)
                    statusIcon = '✅';
                    statusTexto = `Tomou às ${horaReal} (Na hora)`;
                    statusClasse = 'status-ok';
                }

            } else if (reg.tomado === false) {
// ... (o resto da função continua)
                statusIcon = '❌';
                statusTexto = `PULOU às ${reg.horarioProgramado}`;
                statusClasse = 'status-pulado';
                classeCartaoExtra = 'pulado-grave';

            } else {
                // Se reg.tomado for 'null' (pendente), pula este item
                return; // ISSO CORRIGE OS CARTÕES FANTASMA
            }
            // --- FIM DA CORREÇÃO ---

            historicoHtml += `
                <div class="item-historico ${classeCartaoExtra}">
                    <span class="icone-status">${statusIcon}</span>
                    <div class="detalhes-historico">
                        <div class="nome-historico">${reg.apelido}</div>
                        <div class="status-historico ${statusClasse}">${statusTexto}</div>
                    </div>
                </div>
            `;
        });

        historicoHtml += `</div>`;
    }

    listaHistoricoEl.innerHTML = historicoHtml;
}

// CÓDIGO PARA ADICIONAR NO FINAL DO JS

/**
 * Converte uma data (string) e um horário (string) em um timestamp.
 * @param {string} dataString - Ex: "Thu Oct 30 2025" (vem de new Date().toDateString())
 * @param {string} horarioString - Ex: "08:00"
 * @returns {number} O timestamp em milissegundos.
 */
function getTimestampProgramado(dataString, horarioString) {
    const [horas, minutos] = horarioString.split(':').map(Number);
    const data = new Date(dataString);
    data.setHours(horas, minutos, 0, 0); // Define a hora exata naquele dia
    return data.getTime();
}

// CÓDIGO PARA ADICIONAR NO FINAL DO JS

/**
 * Verifica periodicamente se há doses notificadas que não foram tomadas
 * e as marca como "puladas" após um tempo.
 */
// CÓDIGO PARA SUBSTITUIR (A função verificarDosesPerdidas inteira)

/**
 * Verifica periodicamente se há doses pendentes e inicia o "Modo Insistente"
 * ou as marca como "puladas" após 2 horas.
 */
// CÓDIGO PARA SUBSTITUIR (A função verificarDosesPerdidas inteira)

// CÓDIGO PARA SUBSTITUIR (A função verificarDosesPerdidas inteira)

function verificarDosesPerdidas() {
    const agora = new Date();
    const limitePerdidoHoras = 2; // 2h
    let mudancaFeita = false; // Para salvar no localStorage só se algo mudar

    todosMedicamentos.forEach(med => {
        if (!med.historico) return;
        med.historico.forEach(reg => {

            // Se está pendente (notificado, mas não tomado/pulado)
            if (reg.notificado === true && reg.tomado === null) {
                const timestampProgramado = getTimestampProgramado(reg.data, reg.horario);
                const diffMs = agora.getTime() - timestampProgramado;
                const diffMin = Math.floor(diffMs / 60000);
                const diffHoras = diffMs / 3600000;

                // --- CORREÇÃO DA SONECA ---
                // Verifica se existe uma "soneca" ativa para este remédio/horário
                const idSoneca = `soneca_${med.id}_${reg.horario}`;
                const tempoSoneca = localStorage.getItem(idSoneca);

                if (tempoSoneca && agora.getTime() < parseInt(tempoSoneca)) {
                    // Se a soneca existe E o tempo ainda não passou, PULA este remédio.
                    console.log(`Modo soneca ativo para ${med.apelido}. Pulando.`);
                    return; // Vai para o próximo registro
                }
                // Se o tempo da soneca passou, remove a chave
                if (tempoSoneca) {
                    localStorage.removeItem(idSoneca);
                }
                // --- FIM DA CORREÇÃO ---

                // Se passou 2h, marca como PULADO
                if (diffHoras > limitePerdidoHoras) {
                    console.log(`Dose perdida encontrada: ${med.apelido} às ${reg.horario}. Marcando como PULADO.`);
                    reg.tomado = false; 
                    reg.avisoVisto = false;
                    mudancaFeita = true;

                // Se passou do horário (e não está em soneca), mostra o pop-up de atraso
                } else if (diffMin > 5) { // <-- CORREÇÃO (adiciona tolerância de 5 min)
                    console.log(`Mostrando pop-up de atraso para: ${med.apelido} às ${reg.horario}.`);
                    // Mostra o pop-up de atraso
                    mostrarNotificacaoAtraso(med, reg.horario, diffMin);
                }
            }
        });
    });

    if (mudancaFeita) {
        localStorage.setItem('medHelperMedicamentos', JSON.stringify(todosMedicamentos));
        // Atualiza as telas de Avisos/Histórico se estiverem abertas
        const paginaAtual = identificarPaginaPorID();
        if (paginaAtual === 'historico') carregarHistorico();
        if (paginaAtual === 'avisos') carregarAvisos();
    }
}
// CÓDIGO PARA ADICIONAR NO FINAL DO JS

/// EM: roteiro.js - SUBSTITUA A FUNÇÃO obterHorarioMaisRecente INTEIRA
/**
 * Encontra o horário programado mais recente em relação à hora atual.
 * Se a hora atual é 15:21, e a dose é 15:21, ele deve escolher 15:21.
 // EM: roteiro.js - SUBSTITUA A FUNÇÃO obterHorarioMaisRecente INTEIRA
/**
 * Encontra o horário programado mais recente em relação à hora atual.
 * Se a hora atual é 15:21, e a dose é 15:21, ele deve escolher 15:21.
 * @param {object} medicamento - O objeto completo do medicamento.
 * @returns {object} { horaString: "16:00", minutosAtras: 67, dataAlvo: Date }
 */
function obterHorarioMaisRecente(medicamento) { 
    const horarios = medicamento.horarios;
    
    if (!Array.isArray(horarios) || horarios.length === 0) return null; 

    const agora = new Date();
    const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
    
    // Vamos usar apenas 60 minutos (1 hora) de tolerância para o clique manual
    const TOLERANCIA_MAX_DIFERENCA = 60; 

    let melhorHorario = null; 
    let menorDiferencaAbsoluta = Infinity; // Diferença em módulo (sem sinal)

    horarios.forEach(horario => {
        const [horas, minutos] = horario.split(':').map(Number);
        const minutosHorario = horas * 60 + minutos;

        let diferenca = minutosAgora - minutosHorario;
        let diferencaAbsoluta = Math.abs(diferenca);

        // Apenas consideramos horários que estão a no máximo 1h de distância
        if (diferencaAbsoluta <= TOLERANCIA_MAX_DIFERENCA) {
            if (diferencaAbsoluta < menorDiferencaAbsoluta) {
                menorDiferencaAbsoluta = diferencaAbsoluta;
                melhorHorario = horario;
            }
        }
    });

    // Se encontramos um horário
    if (melhorHorario) {
        const [horas, minutos] = melhorHorario.split(':').map(Number);
        const minutosHorario = horas * 60 + minutos;
        const atrasoMinutos = minutosAgora - minutosHorario; // Negativo = adiantamento
        const dataAlvo = new Date();
        dataAlvo.setHours(horas, minutos, 0, 0);

        return { 
            horaString: melhorHorario, 
            minutosAtras: atrasoMinutos, 
            timestamp: dataAlvo.getTime(), 
            dataAlvo: dataAlvo 
        }; 
    }
    
    // Se falhar, retorna o próximo horário (para que o app não quebre)
    return obterProximoHorario(medicamento); 
}
/**
 * Configura os botões da notificação (quais aparecem/somem)
 */
function configurarBotoesNotificacao(medicamento, horario, ehUltimato) {
    const btnTomar = document.getElementById('btnNotifTomar');
    const btnAdiar30m = document.getElementById('btnNotifAdiar30m');
    const btnAdiar1h = document.getElementById('btnNotifAdiar1h');
    const btnPular = document.getElementById('btnNotifPular');

    if (ehUltimato) {
        // Se for o Ultimato, esconde os botões de adiar
        btnTomar.style.display = 'block';
        btnAdiar30m.style.display = 'none';
        btnAdiar1h.style.display = 'none';
        btnPular.style.display = 'block';
    } else {
        // Senão, mostra todas as opções
        btnTomar.style.display = 'block';
        btnAdiar30m.style.display = 'block';
        btnAdiar1h.style.display = 'block';
        btnPular.style.display = 'block';
    }
}


/**
 * Mostra o pop-up VERMELHO de ATRASO
 */
function mostrarNotificacaoAtraso(medicamento, horario, minutosAtraso) {
    const modal = document.getElementById('notificacaoAtraso');
    const overlay = document.getElementById('modalOverlay');
    const elTexto = document.getElementById('notificacaoAtrasoTexto');
    if (!modal || !elTexto || !overlay) return;

    medicamentoNotificacaoAtual = { medicamento, horario }; 

    let textoAviso = "";

    if (minutosAtraso > 90) { // O "Ultimato" (1h 30m)
         textoAviso = `❗️ AVISO FINAL! Seu remédio está há 1h 30m atrasado. Se não for tomado em 30 min, será considerado PULADO.`;
    } else {
        textoAviso = `⚠️ ATRASADO! O remédio ${medicamento.apelido} está há ${minutosAtraso} minutos atrasado.`;
    }

    elTexto.textContent = textoAviso;

    // Configura os botões do pop-up vermelho
    configurarBotoesNotificacaoAtraso(minutosAtraso > 90);

    overlay.style.display = 'block';
    modal.style.display = 'block';
    tocarSomNotificacao();

    if (localStorage.getItem('medHelperVibracao') === 'true' && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
    }

    alternarOuvintesTTS(false);
    falarFeedbackCritico(textoAviso, () => {
        alternarOuvintesTTS(true);
    });
}


// CÓDIGO PARA ADICIONAR NO FINAL DO JS

/**
 * Configura os botões da notificação de ATRASO (quais aparecem/somem)
 */
function configurarBotoesNotificacaoAtraso(ehUltimato) {
    const btnAdiar30m = document.getElementById('btnAtrasoAdiar30m');
    const btnAdiar1h = document.getElementById('btnAtrasoAdiar1h');
    const btnOk = document.getElementById('btnAtrasoOk');

    if (ehUltimato) {
        // Se for o Ultimato, esconde os botões de adiar e o "OK"
        btnAdiar30m.style.display = 'none';
        btnAdiar1h.style.display = 'none';
        btnOk.style.display = 'none';
        // (Implícito que o usuário deve ir na Home ou a dose será pulada)
        // No futuro, poderíamos adicionar um botão "Pular Agora" aqui
    } else {
        // Senão, mostra todas as opções
        btnAdiar30m.style.display = 'block';
        btnAdiar1h.style.display = 'block';
        btnOk.style.display = 'block';
    }
}


/**
 * Fecha TODOS os modais de notificação (azul ou vermelho)
 * (ESTAVA FALTANDO - CORRIGE O BUG 2)
 */
function fecharModaisNotificacao() {
    document.getElementById('notificacaoLembrete').style.display = 'none';
    document.getElementById('notificacaoAtraso').style.display = 'none';
    document.getElementById('modalOverlay').style.display = 'none';
    medicamentoNotificacaoAtual = null;
    alternarOuvintesTTS(true); // Reativa a leitura por mouse
}

/**
 * Mostra o pop-up VERDE de sucesso
 * (ESTAVA FALTANDO - CORRIGE O BUG 2)
 */
function mostrarNotificacaoTemporaria(mensagem) {
    const elNotificacao = document.getElementById('notificacaoTemporaria');
    if (!elNotificacao) return;

    elNotificacao.textContent = mensagem;
    elNotificacao.classList.add('mostrar');

    // Esconde após 4 segundos
    setTimeout(() => {
        elNotificacao.classList.remove('mostrar');
    }, 4000);
}

function configurarPaginaTermos() {
    const btnAceitar = document.getElementById('btnAceitarTermos');
    if (btnAceitar) {
        btnAceitar.addEventListener('click', () => {
            // 1. Marca no localStorage que os termos foram aceitos
            localStorage.setItem('medHelperTermosAceitos', 'true');
            // 2. Manda o usuário para a próxima etapa (boas-vindas)
            window.location.href = 'boasvindas.html';
        });
    }
}


// EM: roteiro.js - Adicione esta função
function configurarPaginaRelatorio() {
    const elRelatorio = document.getElementById('textoRelatorio');
    const btnCopiar = document.getElementById('btnCopiarRelatorio');
    
    // 1. Gera o texto e preenche o bloco
    elRelatorio.textContent = gerarTextoRelatorio();
    
    // 2. Configura a função de copiar
    if (btnCopiar) {
        btnCopiar.addEventListener('click', () => {
            navigator.clipboard.writeText(elRelatorio.textContent)
                .then(() => {
                    const msg = document.getElementById('msgCopia');
                    msg.style.display = 'block';
                    falarFeedbackCritico("Texto copiado! Agora cole no WhatsApp.");
                    setTimeout(() => { msg.style.display = 'none'; }, 3000);
                })
                .catch(err => {
                    alert('Erro ao copiar o texto. Por favor, selecione e copie manualmente.');
                });
        });
    }
}
// EM: roteiro.js - Adicione esta função
function gerarTextoRelatorio() {
    const registros = [];

    // Coleta apenas os registros tomados ou pulados
    todosMedicamentos.forEach(med => {
        med.historico.forEach(reg => {
            if (reg.tomado === true || reg.tomado === false) {
                registros.push({
                    ...reg,
                    apelido: med.apelido
                });
            }
        });
    });

    // Se não houver registros
    if (registros.length === 0) {
        return "Nenhum registro de doses encontrado no histórico.";
    }

    // Ordena pelo mais recente
    registros.sort((a, b) => {
        const dataA = a.dataHoraToma ? new Date(a.dataHoraToma) : new Date(a.data);
        const dataB = b.dataHoraToma ? new Date(b.dataHoraToma) : new Date(b.data);
        return dataB.getTime() - dataA.getTime();
    });

    let texto = `*📝 RELATÓRIO DE MEDICAÇÃO - MEUREMÉDIO*`;
    texto += `\n\n*Relatório gerado em:* ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}`;
    texto += `\n\n*--- REGISTRO DE ÚLTIMAS 48 HORAS ---*\n`;

    const agora = Date.now();
    let ultimoDia = '';
    let registrosAdicionados = 0;

    registros.forEach(reg => {
        // Limita o relatório a 7 dias (para não ficar gigante)
        const dataRegistroMs = reg.dataHoraToma ? new Date(reg.dataHoraToma).getTime() : new Date(reg.data).getTime();
        if ((agora - dataRegistroMs) > (7 * 24 * 60 * 60 * 1000)) return;

        const dataFormatada = new Date(dataRegistroMs).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
        const horaTomada = reg.dataHoraToma ? new Date(reg.dataHoraToma).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) : '';
        
        if (dataFormatada !== ultimoDia) {
            texto += `\n\n*--- ${dataFormatada.toUpperCase()} ---*`;
            ultimoDia = dataFormatada;
        }

        let status = '';
        if (reg.tomado === true) {
            if (reg.atrasoMinutos > 5) {
                status = `🚨 ATRASO (${reg.atrasoMinutos} min)`;
            } else if (reg.atrasoMinutos < 0) {
                status = `⏱️ ADIANTADO (${reg.atrasoMinutos * -1} min)`;
            } else {
                status = `✅ PONTUAL`;
            }
            texto += `\n${horaTomada} | ${reg.apelido} | Status: ${status}`;
        } else {
            status = `❌ PULADA`;
            texto += `\n${reg.horarioProgramado} | ${reg.apelido} | Status: ${status}`;
        }
        registrosAdicionados++;
    });

    if (registrosAdicionados === 0) {
        return "Nenhum registro recente (últimos 7 dias).";
    }

    return texto;
}

// EM: roteiro.js - Adicione esta função
function injetarModalTutorial() {
    const modalHTML = `
    <div class="modal-overlay" id="modalTutorialOverlay" style="display: none; background-color: rgba(0, 0, 0, 0.7); backdrop-filter: none; z-index: 1000;"></div>

    <div class="modal-notificacao" id="modalTutorial" style="display: none; background-color: var(--cor-acento); color: white; max-width: 300px; padding: 20px; z-index: 1001;">
        <p id="tutorialTexto">Bem-vindo! Vamos começar o tour.</p>
        <div style="margin-top: 15px;">
            <button class="btn-modal btn-soneca" id="btnOuvirDeNovo" style="border: 1px solid white;">🔊 Ouvir de Novo</button>
            <button class="btn-modal btn-tomar" id="btnProximaDica" style="background-color: var(--cor-secundaria);">Próximo</button>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function configurarAssistenteBoasVindas() {
    const container = document.querySelector('.assistente-container');
    const etapas = container.querySelectorAll('.etapa');
    const btnSalvarRemedio = document.getElementById('btnSalvarRemedio');

    function irParaEtapa(etapaDesejada) {
        if (etapaDesejada < 1 || etapaDesejada > etapas.length) return;

        etapas.forEach(etapa => {
            const numEtapa = parseInt(etapa.getAttribute('data-etapa'));
            if (numEtapa === etapaDesejada) {
                etapa.classList.add('ativa');
            } else {
                etapa.classList.remove('ativa');
            }
        });
    }

    container.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-acao]');
        if (!btn) return;

        const etapaAtiva = container.querySelector('.etapa.ativa');
        const etapaAtual = parseInt(etapaAtiva.getAttribute('data-etapa'));
        let proximaEtapa = etapaAtual;

        if (btn.getAttribute('data-acao') === 'proximo') {
            if (salvarDadosEtapas(etapaAtual)) {
                proximaEtapa = etapaAtual + 1;
            }
        } else if (btn.getAttribute('data-acao') === 'voltar') {
            proximaEtapa = etapaAtual - 1;
        }

        irParaEtapa(proximaEtapa);
    });

    // Listener para as opções de intervalo (Etapa 7)
    container.addEventListener('click', (e) => {
        if (e.target.closest('.opcoes-intervalo .btn-opcao-intervalo')) {
            const btnIntervalo = e.target.closest('.opcoes-intervalo .btn-opcao-intervalo');
            container.querySelectorAll('.opcoes-intervalo .btn-opcao-intervalo').forEach(b => b.classList.remove('ativo'));
            btnIntervalo.classList.add('ativo');

            const campoManual = document.getElementById('campoIntervaloManual');
            if (btnIntervalo.getAttribute('data-intervalo') === 'outro') {
                campoManual.style.display = 'block';
            } else {
                campoManual.style.display = 'none';
            }
        }
    });


    // Listener para o botão de salvar final (Etapa 10)
    if (btnSalvarRemedio) {
        btnSalvarRemedio.addEventListener('click', () => {
            // Última verificação antes de salvar o remédio
            // Não é necessário salvar mais dados aqui, pois já foram salvos nas etapas anteriores
            
            // Lógica para salvar a foto (se houver) e finalizar
            const inputFoto = document.getElementById('inputFoto');
            if (inputFoto.files.length > 0) {
                // Aqui entraria a lógica de salvar a foto
                // Por enquanto, apenas armazena que a foto existe
                dadosNovoMedicamento.temFoto = true; 
            } else {
                 dadosNovoMedicamento.temFoto = false;
            }

            // Adiciona um ID único para o novo medicamento
            dadosNovoMedicamento.id = 'med_' + Date.now();
            
            // Adiciona o novo medicamento à lista global e salva no localStorage
            todosMedicamentos.push(dadosNovoMedicamento);
            localStorage.setItem('medHelperMedicamentos', JSON.stringify(todosMedicamentos));
            
            // Limpa o objeto temporário
            dadosNovoMedicamento = {};

            // Vai para a tela de conclusão (Etapa 11)
            irParaEtapa(11);
            
            // Redireciona para a Home após um pequeno atraso
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 3000);
        });
    }

    // Listener para o botão de ir para a Home na conclusão (Etapa 11)
    const btnIrParaHome = document.getElementById('btnIrParaHome');
    if (btnIrParaHome) {
        btnIrParaHome.addEventListener('click', () => {
             window.location.href = 'home.html';
        });
    }

    // Inicializa a Etapa 1
    irParaEtapa(1);

    // Listener para o botão Começar (Etapa 1)
    const btnComecar = document.getElementById('btnComecarBoasVindas');
    if (btnComecar) {
        btnComecar.addEventListener('click', () => {
            irParaEtapa(2);
        });
    }
}

