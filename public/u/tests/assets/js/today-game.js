// today-game.js - 슈퍼스타의 하루 (A Day in the Life of a Superstar)

// --- Utility Functions ---
function getDailySeed() {
    const today = new Date();
    return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
}

function mulberry32(seed) {
    return function() {
        seed |= 0;
        seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) | 0;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

function getEulReParticle(word) {
    if (!word || word.length === 0) return "";
    const lastChar = word[word.length - 1];
    const uni = lastChar.charCodeAt(0);
    if (uni < 0xAC00 || uni > 0xD7A3) return "를";
    return (uni - 0xAC00) % 28 > 0 ? "을" : "를";
}

function getWaGwaParticle(word) {
    if (!word || word.length === 0) return "";
    const lastChar = word[word.length - 1];
    const uni = lastChar.charCodeAt(0);
    if (uni < 0xAC00 || uni > 0xD7A3) return "와";
    return (uni - 0xAC00) % 28 > 0 ? "과" : "와";
}

function showFeedback(isSuccess, message) {
    const feedbackMessage = document.getElementById('feedbackMessage');
    if (feedbackMessage) {
        feedbackMessage.innerText = message;
        feedbackMessage.className = `feedback-message ${isSuccess ? 'correct' : 'incorrect'}`;
    }
}

// --- Game State Management ---
let gameState = {};
let currentRandFn = null;

function resetGameState() {
    gameState = {
        day: 1,
        showmanship: 50,
        energy: 50,
        fame: 50,
        actionPoints: 10,
        maxActionPoints: 10,
        resources: { practice_time: 10, stage_outfits: 10, performance_fee: 5, fan_letters: 0 },
        staff: [
            { id: "manager_kim", name: "매니저 김", personality: "현실적", skill: "스케줄 관리", teamwork: 70 },
            { id: "stylist_choi", name: "스타일리스트 최", personality: "감각적", skill: "이미지 메이킹", teamwork: 60 }
        ],
        maxStaff: 5,
        currentScenarioId: "intro",
        lastPlayedDate: new Date().toISOString().slice(0, 10),
        manualDayAdvances: 0,
        dailyEventTriggered: false,
        dailyBonus: { performanceSuccess: 0 },
        dailyActions: { practiced: false, fanMeetingHeld: false, talkedTo: [], minigamePlayed: false },
        venues: {
            practiceRoom: { built: false, durability: 100 },
            broadcastStudio: { built: false, durability: 100 },
            concertHall: { built: false, durability: 100 },
            fanClub: { built: false, durability: 100 },
            fashionStudio: { built: false, durability: 100 }
        },
        starLevel: 0,
        minigameState: {}
    };
    currentRandFn = mulberry32(getDailySeed() + gameState.day);
}

function saveGameState() {
    localStorage.setItem('esfpSuperstarGame', JSON.stringify(gameState));
}

function loadGameState() {
    const savedState = localStorage.getItem('esfpSuperstarGame');
    const today = new Date().toISOString().slice(0, 10);
    if (savedState) {
        let loaded = JSON.parse(savedState);
        if (!loaded.dailyBonus) loaded.dailyBonus = { performanceSuccess: 0 };
        if (!loaded.staff || loaded.staff.length === 0) {
            loaded.staff = [
                { id: "manager_kim", name: "매니저 김", personality: "현실적", skill: "스케줄 관리", teamwork: 70 },
                { id: "stylist_choi", name: "스타일리스트 최", personality: "감각적", skill: "이미지 메이킹", teamwork: 60 }
            ];
        }
        Object.assign(gameState, loaded);

        currentRandFn = mulberry32(getDailySeed() + gameState.day);

        if (gameState.lastPlayedDate !== today) {
            gameState.day += 1;
            gameState.lastPlayedDate = today;
            gameState.manualDayAdvances = 0;
            gameState.dailyEventTriggered = false;
            processDailyEvents();
        }
    } else {
        resetGameState();
        processDailyEvents();
    }
    renderAll();
}

function updateState(changes, displayMessage = null) {
    Object.keys(changes).forEach(key => {
        if (typeof changes[key] === 'object' && changes[key] !== null && !Array.isArray(changes[key])) {
            gameState[key] = { ...gameState[key], ...changes[key] };
        } else {
            gameState[key] = changes[key];
        }
    });
    saveGameState();
    renderAll(displayMessage);
}

// --- UI Rendering ---
function updateGameDisplay(text) {
    const gameArea = document.getElementById('gameArea');
    if(gameArea && text) gameArea.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`;
}

function renderStats() {
    const statsDiv = document.getElementById('gameStats');
    if (!statsDiv) return;
    const staffListHtml = gameState.staff.map(s => `<li>${s.name} (${s.skill}) - 팀워크: ${s.teamwork}</li>`).join('');
    statsDiv.innerHTML = `
        <p><b>활동:</b> ${gameState.day}일차</p>
        <p><b>행동력:</b> ${gameState.actionPoints}/${gameState.maxActionPoints}</p>
        <p><b>쇼맨십:</b> ${gameState.showmanship} | <b>에너지:</b> ${gameState.energy} | <b>인지도:</b> ${gameState.fame}</p>
        <p><b>자원:</b> 연습 시간 ${gameState.resources.practice_time}, 무대 의상 ${gameState.resources.stage_outfits}, 출연료 ${gameState.resources.performance_fee}, 팬레터 ${gameState.resources.fan_letters || 0}</p>
        <p><b>스타 레벨:</b> ${gameState.starLevel}</p>
        <p><b>전담 스태프 (${gameState.staff.length}/${gameState.maxStaff}):</b></p>
        <ul>${staffListHtml}</ul>
    `;
    const manualDayCounter = document.getElementById('manualDayCounter');
    if(manualDayCounter) manualDayCounter.innerText = gameState.manualDayAdvances;
}

function renderChoices(choices) {
    const choicesDiv = document.getElementById('gameChoices');
    if (!choicesDiv) return;
    let dynamicChoices = [];

    if (gameState.currentScenarioId === 'intro') {
        dynamicChoices = gameScenarios.intro.choices;
    } else if (gameState.currentScenarioId === 'action_facility_management') {
        dynamicChoices = gameScenarios.action_facility_management.choices ? [...gameScenarios.action_facility_management.choices] : [];
        if (!gameState.venues.practiceRoom.built) dynamicChoices.push({ text: "연습실 대여 (연습 시간 50, 무대 의상 20)", action: "build_practice_room" });
        if (!gameState.venues.broadcastStudio.built) dynamicChoices.push({ text: "방송 스튜디오 예약 (무대 의상 30, 출연료 30)", action: "build_broadcast_studio" });
        if (!gameState.venues.concertHall.built) dynamicChoices.push({ text: "콘서트 홀 대관 (연습 시간 100, 무대 의상 50, 출연료 50)", action: "build_concert_hall" });
        if (!gameState.venues.fanClub.built) dynamicChoices.push({ text: "팬클럽 창설 (무대 의상 80, 출연료 40)", action: "build_fan_club" });
        if (gameState.venues.broadcastStudio.built && gameState.venues.broadcastStudio.durability > 0 && !gameState.venues.fashionStudio.built) {
            dynamicChoices.push({ text: "패션 스튜디오 계약 (무대 의상 50, 출연료 100)", action: "build_fashion_studio" });
        }
        Object.keys(gameState.venues).forEach(key => {
            const facility = gameState.venues[key];
            if (facility.built && facility.durability < 100) {
                dynamicChoices.push({ text: `${key} 재계약 (무대 의상 10, 출연료 10)`, action: "maintain_facility", params: { facility: key } });
            }
        });
        dynamicChoices.push({ text: "취소", action: "return_to_intro" });
    } else {
        dynamicChoices = choices ? [...choices] : [];
    }

    choicesDiv.innerHTML = dynamicChoices.map(choice => `<button class="choice-btn" data-action="${choice.action}" data-params='${JSON.stringify(choice.params || {})}''">${choice.text}</button>`).join('');
    choicesDiv.querySelectorAll('.choice-btn').forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.action;
            if (gameActions[action]) {
                gameActions[action](JSON.parse(button.dataset.params || '{}'));
            }
        });
    });
}

function renderAll(customDisplayMessage = null) {
    const desc = document.getElementById('gameDescription');
    if (desc) desc.style.display = 'none';
    renderStats();
    
    if (!gameState.currentScenarioId.startsWith('minigame_')) {
        const scenario = gameScenarios[gameState.currentScenarioId] || gameScenarios.intro;
        updateGameDisplay(customDisplayMessage || scenario.text);
        renderChoices(scenario.choices);
    }
}

// --- Game Data ---
const gameScenarios = {
    "intro": { text: "오늘의 스케줄은 무엇인가요?", choices: [
        { text: "연습실 가기", action: "practice" },
        { text: "스태프와 대화하기", action: "talk_to_staff" },
        { text: "팬미팅 개최", action: "hold_fan_meeting" },
        { text: "스케줄 소화하기", action: "show_schedule_options" },
        { text: "활동 장소 관리", action: "show_facility_options" },
        { text: "오늘의 미니게임", action: "play_minigame" }
    ]},
    "daily_event_disagreement": {
        text: "매니저 김과 스타일리스트 최 사이에 의견 차이가 생겼습니다. 다음 스케줄의 컨셉에 대한 당신의 결정이 필요합니다.",
        choices: [
            { text: "매니저의 안정적인 제안을 따른다.", action: "handle_disagreement", params: { first: "manager_kim", second: "stylist_choi" } },
            { text: "스타일리스트의 파격적인 제안을 따른다.", action: "handle_disagreement", params: { first: "stylist_choi", second: "manager_kim" } },
            { text: "두 사람을 모아 절충안을 찾는다.", action: "mediate_disagreement" },
            { text: "일단 내 느낌대로 하겠다며 밀어붙인다.", action: "ignore_event" }
        ]
    },
    "daily_event_scandal": { text: "경쟁 연예인과의 스캔들이 터졌습니다! 해명하느라 에너지를 소모했습니다. (-10 에너지)", choices: [{ text: "확인", action: "return_to_intro" }] },
    "daily_event_sponsorship": { text: "유명 브랜드에서 의상 협찬이 들어왔습니다! (+10 무대 의상)", choices: [{ text: "확인", action: "return_to_intro" }] },
    "daily_event_fan_gift": {
        text: "팬들이 정성껏 준비한 선물을 보내왔습니다. [출연료 50]을 사용하여 팬들에게 역조공 이벤트를 열면 [인지도]가 크게 상승합니다.",
        choices: [
            { text: "이벤트를 연다", action: "accept_fan_gift" },
            { text: "마음만 받는다", action: "decline_fan_gift" }
        ]
    },
    "daily_event_new_staff": {
        choices: [
            { text: "열정을 보고 즉시 채용한다.", action: "welcome_new_unique_staff" },
            { text: "기존 스태프와의 팀워크를 지켜본다.", action: "observe_staff" },
            { text: "우리 팀과는 맞지 않는 것 같다.", action: "reject_staff" }
        ]
    },
    "game_over_showmanship": { text: "당신의 쇼맨십이 바닥났습니다. 대중은 더 이상 당신에게 열광하지 않습니다.", choices: [], final: true },
    "game_over_energy": { text: "에너지가 모두 소진되어 번아웃 상태가 되었습니다. 활동을 중단합니다.", choices: [], final: true },
    "game_over_fame": { text: "인지도가 너무 낮아졌습니다. 당신은 잊혀진 스타가 되었습니다.", choices: [], final: true },
    "game_over_resources": { text: "활동 자금이 모두 떨어져 더 이상 활동할 수 없습니다.", choices: [], final: true },
    "action_schedule_options": {
        text: "어떤 스케줄을 소화하시겠습니까?",
        choices: [
            { text: "보컬/댄스 연습 (연습 시간)", action: "perform_practice" },
            { text: "화보 촬영 (무대 의상)", action: "perform_photo_shoot" },
            { text: "광고 촬영 (출연료)", "action": "perform_commercial_shoot" },
            { text: "취소", "action": "return_to_intro" }
        ]
    },
    "action_facility_management": {
        text: "어떤 활동 장소를 관리하시겠습니까?",
        choices: []
    },
    "schedule_result": {
        text: "",
        choices: [{ text: "확인", action: "show_schedule_options" }]
    },
    "facility_management_result": {
        text: "",
        choices: [{ text: "확인", action: "show_facility_options" }]
    },
    "disagreement_resolution_result": {
        text: "",
        choices: [{ text: "확인", action: "return_to_intro" }]
    }
};

function calculateMinigameReward(minigameName, score) {
    let rewards = { showmanship: 0, energy: 0, fame: 0, message: "" };

    switch (minigameName) {
        case "기억력 순서 맞추기":
            if (score >= 51) {
                rewards.energy = 15;
                rewards.showmanship = 10;
                rewards.fame = 5;
                rewards.message = "완벽한 기억력입니다! 팬들의 이름을 모두 외웠습니다. (+15 에너지, +10 쇼맨십, +5 인지도)";
            } else if (score >= 21) {
                rewards.energy = 10;
                rewards.showmanship = 5;
                rewards.message = "훌륭한 기억력입니다. (+10 에너지, +5 쇼맨십)";
            } else if (score >= 0) {
                rewards.energy = 5;
                rewards.message = "훈련을 완료했습니다. (+5 에너지)";
            } else {
                rewards.message = "훈련을 완료했지만, 아쉽게도 보상은 없습니다.";
            }
            break;
        case "무대 위 제스처 따라하기":
            rewards.showmanship = 10;
            rewards.message = "완벽한 무대 매너입니다! (+10 쇼맨십)";
            break;
        case "즉흥 인터뷰":
            rewards.fame = 5;
            rewards.showmanship = 5;
            rewards.message = "재치있는 답변이었습니다! (+5 인지도, +5 쇼맨십)";
            break;
        case "팬 서비스 챌린지":
            rewards.fame = 10;
            rewards.message = "팬들이 당신에게 감동했습니다! (+10 인지도)";
            break;
        case "패션 코디하기":
            rewards.showmanship = 10;
            rewards.fame = 5;
            rewards.message = "완벽한 스타일링입니다! (+10 쇼맨십, +5 인지도)";
            break;
        default:
            rewards.message = `미니게임 ${minigameName}을(를) 완료했습니다.`;
            break;
    }
    return rewards;
}

const minigames = [
    {
        name: "기억력 순서 맞추기",
        description: "화면에 나타나는 팬들의 얼굴 순서를 기억하고 정확하게 입력하세요. 단계가 올라갈수록 어려워집니다!",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { currentSequence: [], playerInput: [], stage: 1, score: 0, showingSequence: false };
            minigames[0].render(gameArea, choicesDiv);
            minigames[0].showSequence();
        },
        render: (gameArea, choicesDiv) => {
            gameArea.innerHTML = `
                <p><b>단계:</b> ${gameState.minigameState.stage} | <b>점수:</b> ${gameState.minigameState.score}</p>
                <p id="sequenceDisplay" style="font-size: 2em; font-weight: bold; min-height: 1.5em;"></p>
                <p>순서를 기억하고 입력하세요:</p>
                <div id="playerInputDisplay" style="font-size: 1.5em; min-height: 1.5em;">${gameState.minigameState.playerInput.join(' ')}</div>
            `;
            choicesDiv.innerHTML = `
                <div class="number-pad">
                    ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => `<button class="choice-btn num-btn" data-value="${num}">${num}</button>`).join('')}
                    <button class="choice-btn num-btn" data-value="0">0</button>
                    <button class="choice-btn submit-btn" data-action="submitSequence">입력 완료</button>
                    <button class="choice-btn reset-btn" data-action="resetInput">초기화</button>
                </div>
            `;
            choicesDiv.querySelectorAll('.num-btn').forEach(button => {
                button.addEventListener('click', () => minigames[0].processAction('addInput', button.dataset.value));
            });
            choicesDiv.querySelector('.submit-btn').addEventListener('click', () => minigames[0].processAction('submitSequence'));
            choicesDiv.querySelector('.reset-btn').addEventListener('click', () => minigames[0].processAction('resetInput'));
        },
        showSequence: () => {
            gameState.minigameState.showingSequence = true;
            gameState.minigameState.currentSequence = [];
            const sequenceLength = gameState.minigameState.stage + 2;
            for (let i = 0; i < sequenceLength; i++) {
                gameState.minigameState.currentSequence.push(Math.floor(currentRandFn() * 10));
            }

            const sequenceDisplay = document.getElementById('sequenceDisplay');
            let i = 0;
            const interval = setInterval(() => {
                if (i < gameState.minigameState.currentSequence.length) {
                    sequenceDisplay.innerText = gameState.minigameState.currentSequence[i];
                    i++;
                } else {
                    clearInterval(interval);
                    sequenceDisplay.innerText = "입력하세요!";
                    gameState.minigameState.showingSequence = false;
                }
            }, 800);
        },
        processAction: (actionType, value = null) => {
            if (gameState.minigameState.showingSequence) return;

            if (actionType === 'addInput') {
                gameState.minigameState.playerInput.push(parseInt(value));
                document.getElementById('playerInputDisplay').innerText = gameState.minigameState.playerInput.join(' ');
            } else if (actionType === 'resetInput') {
                gameState.minigameState.playerInput = [];
                document.getElementById('playerInputDisplay').innerText = '';
            } else if (actionType === 'submitSequence') {
                const correct = gameState.minigameState.currentSequence.every((num, i) => num === gameState.minigameState.playerInput[i]);

                if (correct && gameState.minigameState.playerInput.length === gameState.minigameState.currentSequence.length) {
                    gameState.minigameState.score += gameState.minigameState.currentSequence.length * 10;
                    gameState.minigameState.stage++;
                    gameState.minigameState.playerInput = [];
                    updateGameDisplay("정답입니다! 다음 단계로 넘어갑니다.");
                    minigames[0].render(document.getElementById('gameArea'), document.getElementById('gameChoices'));
                    setTimeout(() => minigames[0].showSequence(), 1500);
                } else {
                    updateGameDisplay("오답입니다. 게임 종료.");
                    minigames[0].end();
                }
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[0].name, gameState.minigameState.score);
            updateState({
                showmanship: gameState.showmanship + rewards.showmanship,
                energy: gameState.energy + rewards.energy,
                fame: gameState.fame + rewards.fame,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
    { name: "무대 위 제스처 따라하기", description: "화면에 나오는 춤 동작이나 제스처를 따라하세요.", start: (ga, cd) => { ga.innerHTML = "<p>무대 위 제스처 따라하기 - 개발 중</p>"; cd.innerHTML = "<button class='choice-btn' onclick='minigames[1].end()'>종료</button>"; gameState.minigameState = { score: 10 }; }, render: () => {}, processAction: () => {}, end: () => { const r = calculateMinigameReward(minigames[1].name, gameState.minigameState.score); updateState({ showmanship: gameState.showmanship + r.showmanship, energy: gameState.energy + r.energy, fame: gameState.fame + r.fame, currentScenarioId: 'intro' }, r.message); gameState.minigameState = {}; } },
    { name: "즉흥 인터뷰", description: "돌발 질문에 재치있게 답변하여 기자들을 놀라게 하세요.", start: (ga, cd) => { ga.innerHTML = "<p>즉흥 인터뷰 - 개발 중</p>"; cd.innerHTML = "<button class='choice-btn' onclick='minigames[2].end()'>종료</button>"; gameState.minigameState = { score: 15 }; }, render: () => {}, processAction: () => {}, end: () => { const r = calculateMinigameReward(minigames[2].name, gameState.minigameState.score); updateState({ showmanship: gameState.showmanship + r.showmanship, energy: gameState.energy + r.energy, fame: gameState.fame + r.fame, currentScenarioId: 'intro' }, r.message); gameState.minigameState = {}; } },
    { name: "팬 서비스 챌린지", description: "팬들의 다양한 요청에 순발력 있게 대응하여 최고의 팬 서비스를 보여주세요.", start: (ga, cd) => { ga.innerHTML = "<p>팬 서비스 챌린지 - 개발 중</p>"; cd.innerHTML = "<button class='choice-btn' onclick='minigames[3].end()'>종료</button>"; gameState.minigameState = { score: 20 }; }, render: () => {}, processAction: () => {}, end: () => { const r = calculateMinigameReward(minigames[3].name, gameState.minigameState.score); updateState({ showmanship: gameState.showmanship + r.showmanship, energy: gameState.energy + r.energy, fame: gameState.fame + r.fame, currentScenarioId: 'intro' }, r.message); gameState.minigameState = {}; } },
    { name: "패션 코디하기", description: "TPO에 맞는 최고의 무대 의상을 코디하여 당신의 패션 감각을 뽐내세요.", start: (ga, cd) => { ga.innerHTML = "<p>패션 코디하기 - 개발 중</p>"; cd.innerHTML = "<button class='choice-btn' onclick='minigames[4].end()'>종료</button>"; gameState.minigameState = { score: 25 }; }, render: () => {}, processAction: () => {}, end: () => { const r = calculateMinigameReward(minigames[4].name, gameState.minigameState.score); updateState({ showmanship: gameState.showmanship + r.showmanship, energy: gameState.energy + r.energy, fame: gameState.fame + r.fame, currentScenarioId: 'intro' }, r.message); gameState.minigameState = {}; } }
];

// --- Game Actions ---
function spendActionPoint() {
    if (gameState.actionPoints <= 0) {
        updateGameDisplay("행동력이 부족합니다.");
        return false;
    }
    updateState({ actionPoints: gameState.actionPoints - 1 });
    return true;
}

const gameActions = {
    practice: () => {
        if (!spendActionPoint()) return;
        if (gameState.dailyActions.practiced) { updateState({ dailyActions: { ...gameState.dailyActions, practiced: true } }, "오늘은 이미 충분히 연습했습니다."); return; }
        
        let changes = { dailyActions: { ...gameState.dailyActions, practiced: true } };
        let message = "연습실에서 땀을 흘렸습니다.";
        const rand = currentRandFn();
        if (rand < 0.3) { message += " 새로운 안무를 익혔습니다. (+2 쇼맨십)"; changes.showmanship = gameState.showmanship + 2; }
        else if (rand < 0.6) { message += " 컨디션이 좋아 에너지가 넘칩니다. (+2 에너지)"; changes.energy = gameState.energy + 2; }
        else { message += " 특별한 성과는 없었지만, 꾸준함이 중요합니다."; }
        
        updateState(changes, message);
    },
    talk_to_staff: () => {
        if (!spendActionPoint()) return;
        const staffMember = gameState.staff[Math.floor(currentRandFn() * gameState.staff.length)];
        if (gameState.dailyActions.talkedTo.includes(staffMember.id)) { updateState({ dailyActions: { ...gameState.dailyActions, talkedTo: [...gameState.dailyActions.talkedTo, staffMember.id] } }, `${staffMember.name}${getWaGwaParticle(staffMember.name)} 이미 대화했습니다.`); return; }
        
        let changes = { dailyActions: { ...gameState.dailyActions, talkedTo: [...gameState.dailyActions.talkedTo, staffMember.id] } };
        let message = `${staffMember.name}${getWaGwaParticle(staffMember.name)} 대화했습니다. `;
        if (staffMember.teamwork > 80) { message += "그는 당신의 열정을 칭찬하며 다음 스케줄에 대한 좋은 아이디어를 주었습니다. (+5 인지도)"; changes.fame = gameState.fame + 5; }
        else if (staffMember.teamwork < 40) { message += "그는 당신의 돌발 행동에 불만을 표합니다. 팀워크가 하락합니다. (-5 에너지)"; changes.energy = gameState.energy - 5; }
        else { message += "그와의 대화를 통해 스케줄을 재점검했습니다. (+2 에너지)"; changes.energy = gameState.energy + 2; }
        
        updateState(changes, message);
    },
    hold_fan_meeting: () => {
        if (!spendActionPoint()) return;
        if (gameState.dailyActions.fanMeetingHeld) {
            const message = "오늘은 이미 팬미팅을 진행했습니다. 팬들도 휴식이 필요합니다. (-5 인지도)";
            gameState.fame -= 5;
            updateState({ fame: gameState.fame }, message);
            return;
        }
        updateState({ dailyActions: { ...gameState.dailyActions, fanMeetingHeld: true } });
        const rand = currentRandFn();
        let message = "팬미팅을 개최했습니다. ";
        if (rand < 0.5) { message += "팬들의 열광적인 반응에 에너지를 얻었습니다! (+10 에너지, +5 인지도)"; updateState({ energy: gameState.energy + 10, fame: gameState.fame + 5 }); }
        else { message += "팬들과 진솔한 대화를 나누며 쇼맨십이 상승했습니다. (+5 쇼맨십)"; updateState({ showmanship: gameState.showmanship + 5 }); }
        updateGameDisplay(message);
    },
    manualNextDay: () => {
        if (gameState.manualDayAdvances >= 5) { updateGameDisplay("오늘은 더 이상 수동으로 날짜를 넘길 수 없습니다. 내일 다시 시도해주세요."); return; }
        updateState({
            manualDayAdvances: gameState.manualDayAdvances + 1,
            day: gameState.day + 1,
            lastPlayedDate: new Date().toISOString().slice(0, 10),
            dailyEventTriggered: false
        });
        processDailyEvents();
    },
    handle_disagreement: (params) => {
        if (!spendActionPoint()) return;
        const { first, second } = params;
        let message = "";
        let reward = { showmanship: 0, energy: 0, fame: 0 };
        
        const updatedStaff = gameState.staff.map(s => {
            if (s.id === first) {
                s.teamwork = Math.min(100, s.teamwork + 10);
                message += `${s.name}의 의견을 존중했습니다. 그의 팀워크가 상승합니다. `;
                reward.showmanship += 5;
            } else if (s.id === second) {
                s.teamwork = Math.max(0, s.teamwork - 5);
                message += `${second}의 팀워크가 약간 하락했습니다. `;
            }
            return s;
        });
        
        updateState({ ...reward, staff: updatedStaff, currentScenarioId: 'disagreement_resolution_result' }, message);
    },
    mediate_disagreement: () => {
        if (!spendActionPoint()) return;
        const message = "당신의 중재로 스태프들이 화합하여 더 나은 결과물을 만들었습니다! (+10 인지도, +5 쇼맨십)";
        updateState({ fame: gameState.fame + 10, showmanship: gameState.showmanship + 5, currentScenarioId: 'disagreement_resolution_result' }, message);
    },
    ignore_event: () => {
        if (!spendActionPoint()) return;
        const message = "의견 차이를 무시했습니다. 스태프들의 불만이 쌓여 팀워크가 하락합니다. (-10 에너지, -5 인지도)";
        const updatedStaff = gameState.staff.map(s => {
            s.teamwork = Math.max(0, s.teamwork - 5);
            return s;
        });
        updateState({ energy: gameState.energy - 10, fame: gameState.fame - 5, staff: updatedStaff, currentScenarioId: 'disagreement_resolution_result' }, message);
    },
    show_schedule_options: () => updateState({ currentScenarioId: 'action_schedule_options' }),
    show_facility_options: () => updateState({ currentScenarioId: 'action_facility_management' }),
    perform_practice: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.starLevel * 0.1) + (gameState.dailyBonus.performanceSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            message = "연습에 매진했습니다! (+5 연습 시간)";
            changes.resources = { ...gameState.resources, practice_time: gameState.resources.practice_time + 5 };
        } else {
            message = "연습에 집중하지 못했습니다.";
        }
        updateState(changes, message);
    },
    perform_photo_shoot: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.starLevel * 0.1) + (gameState.dailyBonus.performanceSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            message = "화보 촬영을 마쳤습니다! (+5 무대 의상)";
            changes.resources = { ...gameState.resources, stage_outfits: gameState.resources.stage_outfits + 5 };
        } else {
            message = "화보 촬영을 망쳤습니다.";
        }
        updateState(changes, message);
    },
    perform_commercial_shoot: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.starLevel * 0.1) + (gameState.dailyBonus.performanceSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            message = "광고 촬영을 마쳤습니다! (+5 출연료)";
            changes.resources = { ...gameState.resources, performance_fee: gameState.resources.performance_fee + 5 };
        } else {
            message = "광고 촬영을 망쳤습니다.";
        }
        updateState(changes, message);
    },
    build_practice_room: () => {
        if (!spendActionPoint()) return;
        const cost = { practice_time: 50, stage_outfits: 20 };
        let message = "";
        let changes = {};
        if (gameState.resources.stage_outfits >= cost.stage_outfits && gameState.resources.practice_time >= cost.practice_time) {
            gameState.venues.practiceRoom.built = true;
            message = "연습실을 대여했습니다!";
            changes.fame = gameState.fame + 10;
            changes.resources = { ...gameState.resources, stage_outfits: gameState.resources.stage_outfits - cost.stage_outfits, practice_time: gameState.resources.practice_time - cost.practice_time };
        } else {
            message = "자원이 부족하여 대여할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_broadcast_studio: () => {
        if (!spendActionPoint()) return;
        const cost = { stage_outfits: 30, performance_fee: 30 };
        let message = "";
        let changes = {};
        if (gameState.resources.stage_outfits >= cost.stage_outfits && gameState.resources.performance_fee >= cost.performance_fee) {
            gameState.venues.broadcastStudio.built = true;
            message = "방송 스튜디오를 예약했습니다!";
            changes.energy = gameState.energy + 10;
            changes.resources = { ...gameState.resources, stage_outfits: gameState.resources.stage_outfits - cost.stage_outfits, performance_fee: gameState.resources.performance_fee - cost.performance_fee };
        } else {
            message = "자원이 부족하여 예약할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_concert_hall: () => {
        if (!spendActionPoint()) return;
        const cost = { practice_time: 100, stage_outfits: 50, performance_fee: 50 };
        let message = "";
        let changes = {};
        if (gameState.resources.stage_outfits >= cost.stage_outfits && gameState.resources.performance_fee >= cost.performance_fee && gameState.resources.practice_time >= cost.practice_time) {
            gameState.venues.concertHall.built = true;
            message = "콘서트 홀을 대관했습니다!";
            changes.fame = gameState.fame + 20;
            changes.energy = gameState.energy + 20;
            changes.resources = { ...gameState.resources, stage_outfits: gameState.resources.stage_outfits - cost.stage_outfits, performance_fee: gameState.resources.performance_fee - cost.performance_fee, practice_time: gameState.resources.practice_time - cost.practice_time };
        } else {
            message = "자원이 부족하여 대관할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_fan_club: () => {
        if (!spendActionPoint()) return;
        const cost = { stage_outfits: 80, performance_fee: 40 };
        let message = "";
        let changes = {};
        if (gameState.resources.stage_outfits >= cost.stage_outfits && gameState.resources.performance_fee >= cost.performance_fee) {
            gameState.venues.fanClub.built = true;
            message = "팬클럽을 창설했습니다!";
            changes.showmanship = gameState.showmanship + 15;
            changes.fame = gameState.fame + 10;
            changes.resources = { ...gameState.resources, stage_outfits: gameState.resources.stage_outfits - cost.stage_outfits, performance_fee: gameState.resources.performance_fee - cost.performance_fee };
        } else {
            message = "자원이 부족하여 창설할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_fashion_studio: () => {
        if (!spendActionPoint()) return;
        const cost = { stage_outfits: 50, performance_fee: 100 };
        let message = "";
        let changes = {};
        if (gameState.resources.stage_outfits >= cost.stage_outfits && gameState.resources.performance_fee >= cost.performance_fee) {
            gameState.venues.fashionStudio.built = true;
            message = "패션 스튜디오와 계약했습니다!";
            changes.resources = { ...gameState.resources, stage_outfits: gameState.resources.stage_outfits - cost.stage_outfits, performance_fee: gameState.resources.performance_fee - cost.performance_fee };
        } else {
            message = "자원이 부족하여 계약할 수 없습니다.";
        }
        updateState(changes, message);
    },
    maintain_facility: (params) => {
        if (!spendActionPoint()) return;
        const facilityKey = params.facility;
        const cost = { stage_outfits: 10, performance_fee: 10 };
        let message = "";
        let changes = {};
        if (gameState.resources.stage_outfits >= cost.stage_outfits && gameState.resources.performance_fee >= cost.performance_fee) {
            gameState.venues[facilityKey].durability = 100;
            message = `${facilityKey} 장소의 재계약을 완료했습니다. 내구도가 100으로 회복되었습니다.`;
            changes.resources = { ...gameState.resources, stage_outfits: gameState.resources.stage_outfits - cost.stage_outfits, performance_fee: gameState.resources.performance_fee - cost.performance_fee };
        } else {
            message = "재계약에 필요한 자원이 부족합니다.";
        }
        updateState(changes, message);
    },
    upgrade_star_level: () => {
        if (!spendActionPoint()) return;
        const cost = 20 * (gameState.starLevel + 1);
        if (gameState.resources.stage_outfits >= cost && gameState.resources.performance_fee >= cost) {
            gameState.starLevel++;
            updateState({ resources: { ...gameState.resources, stage_outfits: gameState.resources.stage_outfits - cost, performance_fee: gameState.resources.performance_fee - cost }, starLevel: gameState.starLevel });
            updateGameDisplay(`스타 레벨이 올랐습니다! 모든 스케줄 성공률이 10% 증가합니다. (현재 레벨: ${gameState.starLevel})`);
        } else { updateGameDisplay(`레벨업에 필요한 자원이 부족합니다. (무대 의상 ${cost}, 출연료 ${cost} 필요)`); }
        updateState({ currentScenarioId: 'intro' });
    },
    review_fan_letters: () => {
        if (!spendActionPoint()) return;
        const rand = currentRandFn();
        if (rand < 0.3) { updateState({ resources: { ...gameState.resources, stage_outfits: gameState.resources.stage_outfits + 20, performance_fee: gameState.resources.performance_fee + 20 } }); updateGameDisplay("팬레터에서 의상과 출연료를 발견했습니다! (+20 무대 의상, +20 출연료)"); }
        else if (rand < 0.5) { updateState({ showmanship: gameState.showmanship + 10, fame: gameState.fame + 10 }); updateGameDisplay("팬들의 응원에서 새로운 영감을 얻었습니다. (+10 쇼맨십, +10 인지도)"); }
        else { updateGameDisplay("팬들의 사랑을 확인했지만, 특별한 것은 없었습니다."); }
        updateState({ currentScenarioId: 'intro' });
    },
    accept_fan_gift: () => {
        if (!spendActionPoint()) return;
        if (gameState.resources.performance_fee >= 50) {
            updateState({ resources: { ...gameState.resources, performance_fee: gameState.resources.performance_fee - 50, fan_letters: (gameState.resources.fan_letters || 0) + 100 } });
            updateGameDisplay("팬들에게 역조공 이벤트를 열었습니다! 팬들의 사랑이 쏟아집니다.");
        } else { updateGameDisplay("이벤트에 필요한 출연료가 부족합니다."); }
        updateState({ currentScenarioId: 'intro' });
    },
    decline_fan_gift: () => {
        if (!spendActionPoint()) return;
        updateGameDisplay("팬들의 마음만 받기로 했습니다. 팬들이 조금 아쉬워합니다.");
        updateState({ currentScenarioId: 'intro' });
    },
    return_to_intro: () => updateState({ currentScenarioId: 'intro' }),
    play_minigame: () => {
        if (gameState.dailyActions.minigamePlayed) { updateGameDisplay("오늘의 미니게임은 이미 플레이했습니다."); return; }
        if (!spendActionPoint()) return;
        
        const minigameIndex = (gameState.day - 1) % minigames.length;
        const minigame = minigames[minigameIndex];
        
        gameState.currentScenarioId = `minigame_${minigame.name}`;
        
        updateState({ dailyActions: { ...gameState.dailyActions, minigamePlayed: true } }); 
        
        updateGameDisplay(minigame.description);
        minigame.start(document.getElementById('gameArea'), document.getElementById('gameChoices'));
    }
};

function applyStatEffects() {
    let message = "";
    if (gameState.showmanship >= 70) {
        gameState.dailyBonus.performanceSuccess += 0.1;
        message += "뛰어난 쇼맨십 덕분에 스케줄 성공률이 증가합니다. ";
    }
    if (gameState.showmanship < 30) {
        gameState.staff.forEach(s => s.teamwork = Math.max(0, s.teamwork - 5));
        message += "부족한 쇼맨십으로 인해 스태프들의 팀워크가 하락합니다. ";
    }

    if (gameState.energy >= 70) {
        gameState.maxActionPoints += 1;
        gameState.actionPoints = gameState.maxActionPoints;
        message += "넘치는 에너지 덕분에 하루를 더 길게 쓸 수 있습니다. 행동력이 증가합니다. ";
    }
    if (gameState.energy < 30) {
        gameState.maxActionPoints = Math.max(5, gameState.maxActionPoints - 1);
        gameState.actionPoints = Math.min(gameState.actionPoints, gameState.maxActionPoints);
        message += "에너지가 부족하여 활동에 제약이 생깁니다. 행동력이 감소합니다. ";
    }

    if (gameState.fame >= 70) {
        Object.keys(gameState.venues).forEach(key => {
            if (gameState.venues[key].built) gameState.venues[key].durability = Math.min(100, gameState.venues[key].durability + 1);
        });
        message += "높은 인지도 덕분에 활동 장소 관리가 더 잘 이루어집니다. ";
    }
    if (gameState.fame < 30) {
        Object.keys(gameState.venues).forEach(key => {
            if (gameState.venues[key].built) gameState.venues[key].durability = Math.max(0, gameState.venues[key].durability - 2);
        });
        message += "인지도가 하락하여 활동 장소들이 빠르게 노후화됩니다. ";
    }
    return message;
}

function generateRandomStaff() {
    const names = ["실장 박", "팀장 이", "코디 정", "작곡가 윤"];
    const personalities = ["열정적인", "현실적인", "창의적인", "꼼꼼한"];
    const skills = ["스케줄 관리", "이미지 메이킹", "작곡", "보컬 트레이닝"];
    const randomId = Math.random().toString(36).substring(2, 9);

    return {
        id: randomId,
        name: names[Math.floor(currentRandFn() * names.length)],
        personality: personalities[Math.floor(currentRandFn() * personalities.length)],
        skill: skills[Math.floor(currentRandFn() * skills.length)],
        teamwork: 50
    };
}

// --- Daily/Initialization Logic ---
function processDailyEvents() {
    if (gameState.dailyEventTriggered) return;
    currentRandFn = mulberry32(getDailySeed() + gameState.day);

    updateState({
        actionPoints: 10,
        maxActionPoints: 10,
        dailyActions: { practiced: false, fanMeetingHeld: false, talkedTo: [], minigamePlayed: false },
        dailyEventTriggered: true,
        dailyBonus: { performanceSuccess: 0 }
    });

    const statEffectMessage = applyStatEffects();

    let skillBonusMessage = "";
    let durabilityMessage = "";

    gameState.staff.forEach(s => {
        if (s.skill === '스케줄 관리') { gameState.resources.practice_time++; skillBonusMessage += `${s.name}의 관리 덕분에 연습 시간을 추가로 얻었습니다. `; }
        else if (s.skill === '이미지 메이킹') { gameState.resources.stage_outfits++; skillBonusMessage += `${s.name}의 도움으로 무대 의상을 추가로 얻었습니다. `; }
        else if (s.skill === '작곡') { gameState.resources.practice_time += 2; skillBonusMessage += `${s.name}의 곡 덕분에 연습 시간이 2배로 늘어납니다. `; }
    });

    Object.keys(gameState.venues).forEach(key => {
        const facility = gameState.venues[key];
        if(facility.built) {
            facility.durability -= 1;
            if(facility.durability <= 0) {
                facility.built = false;
                durabilityMessage += `${key} 장소의 계약이 만료되었습니다! 재계약이 필요합니다. `;
            }
        }
    });

    gameState.resources.practice_time -= gameState.staff.length * 2;
    let dailyMessage = "새로운 활동일이 시작되었습니다. ";
    dailyMessage += statEffectMessage + skillBonusMessage + durabilityMessage;
    if (gameState.resources.practice_time < 0) {
        gameState.energy -= 10;
        dailyMessage += "연습 시간이 부족하여 에너지가 감소합니다! (-10 에너지)";
    }
    
    const rand = currentRandFn();
    let eventId = "intro";
    if (rand < 0.15) { eventId = "daily_event_scandal"; updateState({resources: {...gameState.resources, energy: Math.max(0, gameState.resources.energy - 10)}}); }
    else if (rand < 0.30) { eventId = "daily_event_sponsorship"; updateState({resources: {...gameState.resources, stage_outfits: gameState.resources.stage_outfits + 10}}); }
    else if (rand < 0.5 && gameState.staff.length >= 2) { eventId = "daily_event_disagreement"; }
    else if (rand < 0.7 && gameState.venues.mainLounge.built && gameState.staff.length < gameState.maxStaff) {
        eventId = "daily_event_new_staff";
        const newStaff = generateRandomStaff();
        gameState.pendingNewStaff = newStaff;
        gameScenarios["daily_event_new_staff"].text = `새로운 스태프 ${newStaff.name}(${newStaff.personality}, ${newStaff.skill})이(가) 합류하고 싶어 합니다. (현재 스태프 수: ${gameState.staff.length} / ${gameState.maxStaff})`;
    }
    else if (rand < 0.85 && gameState.venues.mainLounge.built) { eventId = "daily_event_fan_gift"; }
    
    gameState.currentScenarioId = eventId;
    updateGameDisplay(dailyMessage + (gameScenarios[eventId]?.text || ''));
    renderChoices(gameScenarios[eventId].choices);
    saveGameState();
}

function initDailyGame() {
    loadGameState();
}

function resetGame() {
    if (confirm("정말로 처음부터 다시 시작하시겠습니까? 모든 활동 기록이 사라집니다.")) {
        localStorage.removeItem('esfpSuperstarGame');
        resetGameState();
        saveGameState();
        location.reload();
    }
}

window.onload = function() {
    try {
        initDailyGame();
        document.getElementById('resetGameBtn').addEventListener('click', resetGame);
        document.getElementById('nextDayBtn').addEventListener('click', gameActions.manualNextDay);
    } catch (e) {
        console.error("오늘의 게임 생성 중 오류 발생:", e);
        document.getElementById('gameDescription').innerText = "콘텐츠를 불러오는 데 실패했습니다. 페이지를 새로고침해 주세요.";
    }
};