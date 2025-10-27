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


// --- INICIALIZAÇÃO ---
// Executa quando o HTML da página termina de carregar
document.addEventListener('DOMContentLoaded', () => {

    // 1. Carregar dados essenciais
    nomeUsuario = localStorage.getItem('medHelperNomeUsuario') || '';
    todosMedicamentos = JSON.parse(localStorage.getItem('medHelperMedicamentos')) || [];

    // 2. Identificar a página atual
    const paginaAtual = document.body.parentElement.getAttribute('data-pagina') || identificarPaginaPorID();

    // 3. Lógica de Redirecionamento
    if (paginaAtual !== 'boasvindas' && !nomeUsuario) {
        window.location.href = 'boasvindas.html';
        return;
    }
    if (paginaAtual === 'boasvindas' && nomeUsuario) {
        window.location.href = 'home.html';
        return;
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

    // 5. Injetar componentes comuns
    if (paginaAtual === 'home' || paginaAtual === 'medicamentos' || paginaAtual === 'configuracoes' || paginaAtual === 'adicionar') {
        injetarPainelAcessibilidade();
        injetarNavInferior(paginaAtual);
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
    }

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
function identificarPaginaPorID() {
    if (document.getElementById('pagina-home')) return 'home';
    if (document.getElementById('pagina-medicamentos')) return 'medicamentos';
    if (document.getElementById('pagina-configuracoes')) return 'configuracoes';
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
function injetarContainersNotificacao() {
    const notificacaoHTML = `
    <div class="notificacao" id="notificacaoLembrete">
        <p id="notificacaoLembreteTexto">É hora de tomar seu medicamento!</p>
        <div class="botoes-acao">
            <button class="btn-acao btn-tomar" id="btnNotificacaoTomar" aria-label="Confirmar que tomou">✓</button>
            <button class="btn-acao btn-pular" id="btnNotificacaoPular" aria-label="Pular esta dose">✕</button>
        </div>
    </div>
    
    <div class="notificacao sucesso" id="notificacaoTemporaria"></div>`;
    document.body.insertAdjacentHTML('beforeend', notificacaoHTML);
}


// --- CONFIGURAÇÃO DAS PÁGINAS ---

function configurarPaginaHome() {
    atualizarHora();
    setInterval(atualizarHora, 1000); // Atualiza a cada segundo
    
    atualizarSaudacao();
    carregarListaMedicamentos('home'); // Carrega lista curta
    
    // Verifica lembretes de medicamentos
    verificarLembretes();
    setInterval(verificarLembretes, 60000); // A cada minuto
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
    
    // Botões com lógica específica
    if (fluxo === 'boasvindas') {
        document.getElementById('btnComecarBoasVindas').addEventListener('click', () => proximaEtapa());
        document.getElementById('btnSalvarNome').addEventListener('click', salvarNomeEProximaEtapa);
        document.getElementById('btnIniciarCadastroRemedio').addEventListener('click', () => proximaEtapa());
        document.getElementById('btnPularCadastro').addEventListener('click', () => {
            // Pula para a etapa de conclusão
            etapaAtual = 11;
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
}

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
    // Validação e salvamento de dados da etapa ATUAL
    if (!salvarDadosEtapa(etapaAtual)) {
        // Se a validação falhar, não avança
        falarTexto("Por favor, preencha a informação pedida.");
        return; 
    }

    etapaAtual++;
    mostrarEtapa(etapaAtual);
}

function etapaAnterior() {
    etapaAtual--;
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
function salvarDadosEtapa(numeroEtapa) {
    let input;
    // Pega o número da etapa no fluxo de 'boasvindas'
    // O fluxo 'adicionar' começa em uma etapa diferente, então ajustamos
    let etapaFluxoBoasVindas = numeroEtapa;
    if (fluxoAssistente === 'adicionar') {
        etapaFluxoBoasVindas = numeroEtapa + 3; // O fluxo 'adicionar' começa na etapa 4 do 'boasvindas'
    }

    switch (etapaFluxoBoasVindas) {
        case 4: // Nome do Remédio
            input = document.getElementById('inputNomeRemedio');
            if (!input.value.trim()) return false;
            dadosNovoMedicamento.nome = input.value.trim();
            break;
        case 5: // Apelido
            input = document.getElementById('inputApelidoRemedio');
            if (!input.value.trim()) return false;
            dadosNovoMedicamento.apelido = input.value.trim();
            break;
        case 6: // Dose
            input = document.getElementById('inputDose');
            if (!input.value.trim()) return false;
            dadosNovoMedicamento.dose = input.value.trim();
            break;
        case 7: // Primeiro Horário
            input = document.getElementById('inputPrimeiroHorario');
            if (!input.value) return false;
            dadosNovoMedicamento.primeiroHorario = input.value;
            break;
        case 8: // Intervalo
            // Já salvo no clique do botão
            if (!dadosNovoMedicamento.intervalo) return false;
            break;
        case 9: // Duração
            input = document.getElementById('inputDuracao');
            dadosNovoMedicamento.duracao = input.value.trim() || null; // Salva nulo se vazio
            break;
        case 10: // Foto
            // Já salva no 'change' do input
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

    const novoMedicamento = {
        id: Date.now().toString(),
        nome: dadosNovoMedicamento.nome,
        apelido: dadosNovoMedicamento.apelido,
        dose: dadosNovoMedicamento.dose,
        horarios: horarios,
        imagemUrl: dadosNovoMedicamento.imagemUrl || null,
        duracao: dadosNovoMedicamento.duracao,
        dataInicio: dataInicio.toISOString(),
        dataFim: dataFim ? dataFim.toISOString() : null,
        historico: []
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

function atualizarHora() {
    const elHoraAtual = document.getElementById('horaAtual');
    if (elHoraAtual) {
        const agora = new Date();
        elHoraAtual.textContent = agora.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
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
function carregarListaMedicamentos(tipo) {
    const elListaHome = document.getElementById('listaMedicamentosHome');
    const elListaCompleta = document.getElementById('listaCompletaMedicamentos');
    const elInfoProximo = document.getElementById('infoProximoMedicamento');
    
    let elAlvo = (tipo === 'home') ? elListaHome : elListaCompleta;
    
    if (!elAlvo) return; // Sai se o elemento não existir na página

    // Filtra medicamentos cujo tratamento já acabou
    const agora = new Date();
    const medicamentosAtivos = todosMedicamentos.filter(med => {
        if (!med.dataFim) return true; // Uso contínuo
        return (new Date(med.dataFim) > agora); // Ainda não terminou
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
    
    elAlvo.innerHTML = ''; // Limpa a lista
    let proximoHorarioGlobal = Infinity;
    let detalhesProximoGlobal = 'Nenhum medicamento agendado.';

    // Ordena os medicamentos pelo próximo horário
    const medicamentosOrdenados = medicamentosAtivos.map(med => {
        const proximoHorario = obterProximoHorario(med.horarios);
        return { med, proximoHorario };
    }).sort((a, b) => a.proximoHorario.timestamp - b.proximoHorario.timestamp);


    medicamentosOrdenados.forEach(item => {
        const med = item.med;
        const proximo = item.proximoHorario;

        // Atualiza o card de "Próximo Medicamento"
        if (proximo.timestamp < proximoHorarioGlobal) {
            proximoHorarioGlobal = proximo.timestamp;
            detalhesProximoGlobal = `${med.apelido} (${med.dose}) às ${proximo.horaString}`;
        }

        const cartao = document.createElement('div');
        cartao.className = 'cartao-medicamento';
        cartao.innerHTML = `
            <div class="imagem-medicamento">
                ${med.imagemUrl ? `<img src="${med.imagemUrl}" alt="${med.nome}" style="width:100%;height:100%;border-radius:50%;">` : '💊'}
            </div>
            <div class="info-medicamento">
                <div class="nome-medicamento">${med.apelido}</div>
                <div class="detalhes-medicamento">
                    <span class="dose-medicamento">${med.dose}</span>
                    <span class="horario-medicamento">Próximo: ${proximo.horaString}</span>
                </div>
            </div>
            <div class="botoes-acao">
                <button class="btn-acao btn-tomar" data-id="${med.id}" aria-label="Tomar ${med.apelido}">✓</button>
                ${tipo === 'completa' ? `<a href="editar.html?id=${med.id}" class="btn-acao btn-editar" aria-label="Editar ${med.apelido}">✏️</a>` : ''}
            </div>
        `;
        elAlvo.appendChild(cartao);
    });

    // Atualiza o card de "Próximo Medicamento"
    if (elInfoProximo) {
        elInfoProximo.innerHTML = `<p>${detalhesProximoGlobal}</p>`;
    }
    
    // Configura os botões de "Tomar" e "Deletar"
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
/**
 * Encontra o próximo horário a partir de agora
 * @returns {object} { horaString: 'HH:MM', timestamp: ... }
 */
function obterProximoHorario(horarios) {
    const agora = new Date();
    const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
    
    let proximoHorario = null;
    let menorDiferenca = Infinity;
    let proximoTimestamp = Infinity;

    horarios.forEach(horario => {
        const [horas, minutos] = horario.split(':').map(Number);
        const minutosHorario = horas * 60 + minutos;
        
        let diferenca = minutosHorario - minutosAgora;
        
        // Cria um timestamp para hoje nesse horário
        const dataHorario = new Date();
        dataHorario.setHours(horas, minutos, 0, 0);

        // Se o horário já passou hoje, a diferença é para o dia seguinte
        if (diferenca <= 0) {
            diferenca += 24 * 60; // Adiciona 24h em minutos
            dataHorario.setDate(dataHorario.getDate() + 1);
        }

        if (diferenca < menorDiferenca) {
            menorDiferenca = diferenca;
            proximoHorario = horario;
            proximoTimestamp = dataHorario.getTime();
        }
    });
    
    return { horaString: proximoHorario, timestamp: proximoTimestamp };
}

// --- LÓGICA DE LEMBRETES E NOTIFICAÇÕES ---

function verificarLembretes() {
    const agora = new Date();
    const horaAtual = agora.toTimeString().substring(0, 5); // Formato HH:MM
    const hojeString = agora.toDateString(); // Formato "Wed Oct 22 2025"

    todosMedicamentos.forEach(med => {
        // Verifica se o tratamento acabou
        if (med.dataFim && new Date(med.dataFim) < agora) {
            return; // Pula este remédio
        }

        med.horarios.forEach(horario => {
            if (horario === horaAtual) {
                // Verificar se já foi notificado HOJE para ESTE HORÁRIO
                const jaNotificado = med.historico.some(reg => 
                    reg.data === hojeString && reg.horario === horario && reg.notificado
                );
                
                if (!jaNotificado) {
                    mostrarNotificacaoLembrete(med, horario);
                    
                    // Marcar como notificado
                    med.historico.push({
                        data: hojeString,
                        horario: horario,
                        notificado: true,
                        tomado: null // Ainda não se sabe
                    });
                    
                    localStorage.setItem('medHelperMedicamentos', JSON.stringify(todosMedicamentos));
                }
            }
        });
    });
}

function mostrarNotificacaoLembrete(medicamento, horario) {
    const elNotificacao = document.getElementById('notificacaoLembrete');
    const elTexto = document.getElementById('notificacaoLembreteTexto');
    
    if (!elNotificacao || !elTexto) return;

    medicamentoNotificacaoAtual = { medicamento, horario }; // Salva o contexto
    
    elTexto.textContent = `Hora de tomar ${medicamento.apelido}!`;
    elNotificacao.classList.add('mostrar');
    
    tocarSomNotificacao();
    
    if (localStorage.getItem('medHelperVibracao') === 'true' && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200]);
    }
    
    // 1. Desliga a leitura por mouse para não interromper o aviso.
alternarOuvintesTTS(false);

// 2. Fala a frase e, ao terminar, reativa a leitura por mouse.
falarFeedbackCritico(`${nomeUsuario}, é hora de tomar o ${medicamento.apelido}. ${medicamento.dose}.`, () => {
    alternarOuvintesTTS(true);
});
}

function registrarMedicamentoTomado(id) {
    const agora = new Date();
    const hojeString = agora.toDateString();
    let horarioRegistrar;

    let med;

    // Verifica se veio da notificação
    if (medicamentoNotificacaoAtual && medicamentoNotificacaoAtual.medicamento.id === id) {
        med = medicamentoNotificacaoAtual.medicamento;
        horarioRegistrar = medicamentoNotificacaoAtual.horario;
        // Esconde a notificação
        document.getElementById('notificacaoLembrete').classList.remove('mostrar');
    } else {
        // Veio do clique no cartão
        med = todosMedicamentos.find(m => m.id === id);
        // Pega o próximo horário, que deve ser o que ele está tomando
        horarioRegistrar = obterProximoHorario(med.horarios).horaString;
    }

    if (!med) return;
    
    // Tenta encontrar um registro existente para atualizar
    let registro = med.historico.find(r => r.data === hojeString && r.horario === horarioRegistrar);
    
    if (registro) {
        registro.tomado = true;
    } else {
        // Cria um novo registro se não houver notificação
        med.historico.push({
            data: hojeString,
            horario: horarioRegistrar,
            notificado: true,
            tomado: true
        });
    }
    
    localStorage.setItem('medHelperMedicamentos', JSON.stringify(todosMedicamentos));
    
    // Recarrega as listas
    if (document.getElementById('listaCompletaMedicamentos')) carregarListaMedicamentos('completa');
    if (document.getElementById('listaMedicamentosHome')) carregarListaMedicamentos('home');

    // MENSAGEM DE CONFIRMAÇÃO
    const proximoHorario = obterProximoHorario(med.horarios).horaString;
    const mensagem = `Muito bom! Próxima dose às ${proximoHorario}.`;
    
    mostrarNotificacaoTemporaria(mensagem);


    // 1. Desliga a leitura por mouse para não interromper a confirmação.
alternarOuvintesTTS(false);

// 2. Fala a confirmação e, ao terminar, reativa a leitura.
falarFeedbackCritico(`Registrado! ${med.apelido} tomado. Próxima dose às ${proximoHorario}.`, () => {
    alternarOuvintesTTS(true);
});

    medicamentoNotificacaoAtual = null; // Limpa a notificação atual
}

function registrarMedicamentoPulado() {
    if (!medicamentoNotificacaoAtual) return;

    const { medicamento, horario } = medicamentoNotificacaoAtual;
    const agora = new Date();
    const hojeString = agora.toDateString();

    // Tenta encontrar um registro existente para atualizar
    let registro = medicamento.historico.find(r => r.data === hojeString && r.horario === horario);
    
    if (registro) {
        registro.tomado = false;
    } else {
        medicamento.historico.push({
            data: hojeString,
            horario: horario,
            notificado: true,
            tomado: false
        });
    }

    localStorage.setItem('medHelperMedicamentos', JSON.stringify(todosMedicamentos));
    
    document.getElementById('notificacaoLembrete').classList.remove('mostrar');
    falarTexto(`${medicamento.apelido} pulado.`);
    medicamentoNotificacaoAtual = null;
}

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
    const btnNotificacaoTomar = document.getElementById('btnNotificacaoTomar');
    if (btnNotificacaoTomar) {
        btnNotificacaoTomar.addEventListener('click', () => {
            if(medicamentoNotificacaoAtual) {
                registrarMedicamentoTomado(medicamentoNotificacaoAtual.medicamento.id);
            }
        });
    }
    const btnNotificacaoPular = document.getElementById('btnNotificacaoPular');
    if (btnNotificacaoPular) {
        btnNotificacaoPular.addEventListener('click', registrarMedicamentoPulado);
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
        const enunciado = new SpeechSynthesisUtterance(texto);
        enunciado.lang = 'pt-BR';
        enunciado.rate = 1.0;

        // Se uma função de "callback" foi passada, nós a executamos no final.
        if (aoTerminar && typeof aoTerminar === 'function') {
            enunciado.onend = aoTerminar;
        }

        sinteseVoz.speak(enunciado);
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
        '.formulario-container h2', // Título do formulário
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
    // --- FIM DA CORREÇÃO ---
} // Este '}' fecha a função configurarPaginaEditar


function preencherFormularioEdicao(medicamento) {
    document.getElementById('inputNomeRemedio').value = medicamento.nome || '';
    document.getElementById('inputApelidoRemedio').value = medicamento.apelido || '';
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
    const medicamentoAtualizado = {
        ...todosMedicamentos[medIndex], // Copia todas as propriedades antigas (como id, imagem, etc.)
        nome: novoNome,
        apelido: novoApelido,
        dose: novaDose,
        duracao: novaDuracao || null,
        horarios: calcularHorarios(novoIntervalo, novoPrimeiroHorario) // Recalcula os horários com os novos dados
    };

    // Substitui o objeto antigo pelo novo objeto atualizado no array
    todosMedicamentos[medIndex] = medicamentoAtualizado;

    // Salva o array completo e atualizado no localStorage
    localStorage.setItem('medHelperMedicamentos', JSON.stringify(todosMedicamentos));

    // Avisa o usuário e volta para a lista
    alert("Medicamento atualizado com sucesso!");
    window.location.href = 'medicamentos.html';
}