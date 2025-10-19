// today-game.js - ESFP - 슈퍼스타의 하루 (A Superstar's Day)

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

function getRandomValue(base, variance) {
    const min = base - variance;
    const max = base + variance;
    return Math.floor(currentRandFn() * (max - min + 1)) + min;
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
        popularity: 50,
        talent: 50,
        charm: 50,
        actionPoints: 10, // Internally actionPoints, but represents '행동력' in UI
        maxActionPoints: 10,
        resources: { practice_time: 10, stage_outfits: 10, performance_fees: 5, fan_club_members: 0 },
        staff: [
            { id: "manager_kim", name: "김매니저", personality: "현실적", skill: "스케줄 관리", trust: 70 },
            { id: "stylist_lee", name: "이스타", personality: "꼼꼼한", skill: "이미지 메이킹", trust: 60 }
        ],
        maxStaff: 5,
        currentScenarioId: "intro",
        lastPlayedDate: new Date().toISOString().slice(0, 10),
        manualDayAdvances: 0,
        dailyEventTriggered: false,
        dailyBonus: { performanceSuccess: 0 }, // Re-themed from gatheringSuccess
        dailyActions: { practiced: false, performed: false, metFans: false, minigamePlayed: false }, // Re-themed
        activityVenues: {
            practiceRoom: { built: false, durability: 100, name: "연습실", description: "재능을 갈고닦고 실력을 향상시킵니다.", effect_description: "재능 및 에너지 증가." },
            broadcastStudio: { built: false, durability: 100, name: "방송 스튜디오", description: "방송에 출연하여 대중에게 자신을 알립니다.", effect_description: "인지도 및 쇼맨십 증가." },
            concertHall: { built: false, durability: 100, name: "콘서트 홀", description: "대규모 공연을 개최하여 팬들과 소통합니다.", effect_description: "팬클럽 회원 수 및 인기 증가." },
            fanClub: { built: false, durability: 100, name: "팬클럽", description: "팬들과 소통하고 팬심을 관리합니다.", effect_description: "매력 및 인지도 증가." },
            fashionStudio: { built: false, durability: 100, name: "패션 스튜디오", description: "무대 의상을 제작하고 스타일을 연출합니다.", effect_description: "쇼맨십 및 매력 증가." }
        },
        starLevel: 0, // Re-themed from toolsLevel
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
        // Patch for old save files
        if (!loaded.dailyBonus) loaded.dailyBonus = { performanceSuccess: 0 };
        if (!loaded.staff || loaded.staff.length === 0) {
            loaded.staff = [
                { id: "manager_kim", name: "김매니저", personality: "현실적", skill: "스케줄 관리", trust: 70 },
                { id: "stylist_lee", name: "이스타", personality: "꼼꼼한", skill: "이미지 메이킹", trust: 60 }
            ];
        }
        if (!loaded.activityVenues) {
            loaded.activityVenues = {
                practiceRoom: { built: false, durability: 100, name: "연습실", description: "재능을 갈고닦고 실력을 향상시킵니다.", effect_description: "재능 및 에너지 증가." },
                broadcastStudio: { built: false, durability: 100, name: "방송 스튜디오", description: "방송에 출연하여 대중에게 자신을 알립니다.", effect_description: "인지도 및 쇼맨십 증가." },
                concertHall: { built: false, durability: 100, name: "콘서트 홀", description: "대규모 공연을 개최하여 팬들과 소통합니다.", effect_description: "팬클럽 회원 수 및 인기 증가." },
                fanClub: { built: false, durability: 100, name: "팬클럽", description: "팬들과 소통하고 팬심을 관리합니다.", effect_description: "매력 및 인지도 증가." },
                fashionStudio: { built: false, durability: 100, name: "패션 스튜디오", description: "무대 의상을 제작하고 스타일을 연출합니다.", effect_description: "쇼맨십 및 매력 증가." }
            };
        }
        // Ensure new stats are initialized if loading old save
        if (loaded.showmanship === undefined) loaded.showmanship = 50;
        if (loaded.energy === undefined) loaded.energy = 50;
        if (loaded.popularity === undefined) loaded.popularity = 50;
        if (loaded.talent === undefined) loaded.talent = 50;
        if (loaded.charm === undefined) loaded.charm = 50;
        if (loaded.starLevel === undefined) loaded.starLevel = 0;

        Object.assign(gameState, loaded);

        // Always initialize currentRandFn after loading state
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
    const staffListHtml = gameState.staff.map(s => `<li>${s.name} (${s.skill}) - 신뢰도: ${s.trust}</li>`).join('');
    statsDiv.innerHTML = `
        <p><b>날짜:</b> ${gameState.day}일</p>
        <p><b>행동력:</b> ${gameState.actionPoints}/${gameState.maxActionPoints}</p>
        <p><b>쇼맨십:</b> ${gameState.showmanship} | <b>에너지:</b> ${gameState.energy} | <b>인지도:</b> ${gameState.popularity} | <b>재능:</b> ${gameState.talent} | <b>매력:</b> ${gameState.charm}</p>
        <p><b>자원:</b> 연습 시간 ${gameState.resources.practice_time}, 무대 의상 ${gameState.resources.stage_outfits}, 출연료 ${gameState.resources.performance_fees}, 팬클럽 회원 수 ${gameState.resources.fan_club_members || 0}</p>
        <p><b>스타 레벨:</b> ${gameState.starLevel}</p>
        <p><b>스태프 (${gameState.staff.length}/${gameState.maxStaff}):</b></p>
        <ul>${staffListHtml}</ul>
        <p><b>활동 장소:</b></p>
        <ul>${Object.values(gameState.activityVenues).filter(v => v.built).map(v => `<li>${v.name} (내구도: ${v.durability}) - ${v.effect_description}</li>`).join('') || '없음'}</ul>
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
    } else if (gameState.currentScenarioId === 'action_venue_management') {
        dynamicChoices = gameScenarios.action_venue_management.choices ? [...gameScenarios.action_venue_management.choices] : [];
        // Build options
        if (!gameState.activityVenues.practiceRoom.built) dynamicChoices.push({ text: "연습실 구축 (연습 시간 50, 무대 의상 20)", action: "build_practiceRoom" });
        if (!gameState.activityVenues.broadcastStudio.built) dynamicChoices.push({ text: "방송 스튜디오 구축 (무대 의상 30, 출연료 30)", action: "build_broadcastStudio" });
        if (!gameState.activityVenues.concertHall.built) dynamicChoices.push({ text: "콘서트 홀 구축 (연습 시간 100, 무대 의상 50, 출연료 50)", action: "build_concertHall" });
        if (!gameState.activityVenues.fanClub.built) dynamicChoices.push({ text: "팬클럽 구축 (무대 의상 80, 출연료 40)", action: "build_fanClub" });
        if (gameState.activityVenues.broadcastStudio.built && gameState.activityVenues.broadcastStudio.durability > 0 && !gameState.activityVenues.fashionStudio.built) {
            dynamicChoices.push({ text: "패션 스튜디오 구축 (무대 의상 50, 출연료 100)", action: "build_fashionStudio" });
        }
        // Maintenance options
        Object.keys(gameState.activityVenues).forEach(key => {
            const venue = gameState.activityVenues[key];
            if (venue.built && venue.durability < 100) {
                dynamicChoices.push({ text: `${venue.name} 보수 (무대 의상 10, 출연료 10)`, action: "maintain_venue", params: { venue: key } });
            }
        });
        dynamicChoices.push({ text: "취소", action: "return_to_intro" });
    } else { // For any other scenario, use its predefined choices
        dynamicChoices = choices ? [...choices] : [];
    }

    choicesDiv.innerHTML = dynamicChoices.map(choice => `<button class="choice-btn" data-action="${choice.action}" data-params='${JSON.stringify(choice.params || {})}' >${choice.text}</button>`).join('');
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
    "intro": { text: "슈퍼스타의 하루, 무엇을 할까요?", choices: [
        { text: "연습하기", action: "practice_talent" },
        { text: "방송 출연", action: "appear_on_broadcast" },
        { text: "팬미팅 개최", action: "hold_fan_meeting" },
        { text: "자원 관리", action: "show_resource_management_options" },
        { text: "활동 장소 관리", action: "show_venue_management_options" },
        { text: "자유 시간", action: "show_free_time_options" },
        { text: "오늘의 무대", action: "play_minigame" }
    ]},
    "daily_event_street_performance": {
        text: "", // Set by onTrigger
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "daily_event_scandal": {
        text: "", // Set by onTrigger
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "daily_event_sponsorship": {
        text: "", // Set by onTrigger
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "daily_event_fan_gift": {
        text: "", // Set by onTrigger
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "daily_event_staff_dispute": {
        text: "김매니저와 이스타 사이에 스케줄 관리에 대한 작은 의견 차이가 생겼습니다. 둘 다 당신의 판단을 기다리는 것 같습니다.",
        choices: [
            { text: "김매니저의 관점을 먼저 들어준다.", action: "handle_staff_dispute", params: { first: "manager_kim", second: "stylist_lee" } },
            { text: "이스타의 관점을 먼저 들어준다.", action: "handle_staff_dispute", params: { first: "stylist_lee", second: "manager_kim" } },
            { text: "둘을 불러 효율적인 해결책을 찾는다.", action: "mediate_staff_dispute" },
            { text: "신경 쓰지 않는다.", action: "ignore_event" }
        ]
    },
    "daily_event_new_staff": {
        choices: [
            { text: "유능한 스태프를 영입한다.", action: "welcome_new_unique_staff" },
            { text: "팀에 필요한지 좀 더 지켜본다.", action: "observe_staff" },
            { text: "정중히 거절한다.", action: "reject_staff" }
        ]
    },
    "daily_event_media_interview": {
        text: "외부 언론에서 당신과의 인터뷰를 요청했습니다. 그들은 [출연료 50개]를 [팬클럽 회원 수 5개]와 교환하자고 제안합니다.",
        choices: [
            { text: "제안을 수락한다", action: "accept_interview" },
            { text: "제안을 거절한다", action: "decline_interview" }
        ]
    },
    "daily_event_talent_crisis": {
        text: "갑자기 재능이 고갈되는 것 같습니다. 무대 위에서 자신감이 떨어집니다.",
        choices: [
            { text: "새로운 영감을 찾아 재능을 회복한다 (행동력 1 소모)", action: "seek_inspiration_for_talent" },
            { text: "휴식을 취하며 기다린다", action: "wait_for_talent_recovery" }
        ]
    },
    "daily_event_charm_decline": {
        text: "팬들과의 소통이 원활하지 않습니다. 당신의 매력이 떨어지는 것 같습니다.",
        choices: [
            { text: "팬들과 적극적으로 소통하여 매력을 회복한다 (행동력 1 소모)", action: "reconnect_with_fans" },
            { text: "혼자만의 시간을 가진다", action: "take_personal_time" }
        ]
    },
    "game_over_showmanship": { text: "당신의 쇼맨십이 사라져 더 이상 무대에서 빛날 수 없습니다. 슈퍼스타의 꿈은 좌절되었습니다.", choices: [], final: true },
    "game_over_energy": { text: "당신의 에너지가 고갈되어 더 이상 활동할 수 없습니다. 슈퍼스타의 하루는 끝났습니다.", choices: [], final: true },
    "game_over_popularity": { text: "당신의 인기가 바닥을 쳤습니다. 더 이상 팬들이 당신을 찾지 않습니다. 슈퍼스타는 잊혀졌습니다.", choices: [], final: true },
    "game_over_talent": { text: "당신의 재능이 사라져 더 이상 무대에서 실력을 발휘할 수 없습니다. 슈퍼스타의 꿈은 좌절되었습니다.", choices: [], final: true },
    "game_over_charm": { text: "당신의 매력이 사라져 팬들이 당신에게서 등을 돌렸습니다. 슈퍼스타는 고독해졌습니다.", choices: [], final: true },
    "game_over_resources": { text: "활동 자원이 모두 고갈되어 더 이상 슈퍼스타 활동을 할 수 없습니다.", choices: [], final: true },
    "action_resource_management": {
        text: "어떤 자원을 관리하시겠습니까?",
        choices: [
            { text: "연습 시간 관리", action: "manage_practice_time" },
            { text: "무대 의상 제작", action: "create_stage_outfits" },
            { text: "출연료 협상", action: "negotiate_performance_fees" },
            { text: "취소", action: "return_to_intro" }
        ]
    },
    "action_venue_management": {
        text: "어떤 활동 장소를 관리하시겠습니까?",
        choices: [] // Choices will be dynamically added in renderChoices
    },
    "resource_management_result": {
        text: "", // Text will be set dynamically by updateGameDisplay
        choices: [{ text: "확인", action: "show_resource_management_options" }] // Return to gathering menu
    },
    "venue_management_result": {
        text: "", // Text will be set dynamically by updateGameDisplay
        choices: [{ text: "확인", action: "show_venue_management_options" }] // Return to facility management menu
    },
    "staff_dispute_resolution_result": {
        text: "", // This will be set dynamically
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "free_time_menu": {
        text: "어떤 자유 시간을 보내시겠습니까?",
        choices: [
            { text: "즉흥 공연 (행동력 1 소모)", action: "spontaneous_performance" },
            { text: "팬들과 소통 (행동력 1 소모)", action: "fan_interaction_event" },
            { text: "취소", action: "return_to_intro" }
        ]
    },
};

const auditBudgetOutcomes = [
    {
        condition: (gs) => gs.energy < 40,
        weight: 40,
        effect: (gs) => {
            const energyLoss = getRandomValue(10, 4);
            const popularityLoss = getRandomValue(5, 2);
            const showmanshipLoss = getRandomValue(5, 2);
            return {
                changes: { energy: gs.energy - energyLoss, popularity: gs.popularity - popularityLoss, showmanship: gs.showmanship - showmanshipLoss },
                message: `스케줄 감사가 시작되자마자 스태프들의 불만이 터져 나왔습니다. 낮은 에너지로 인해 분위기가 험악합니다. (-${energyLoss} 에너지, -${popularityLoss} 인기, -${showmanshipLoss} 쇼맨십)`
            };
        }
    },
    {
        condition: (gs) => gs.talent > 70 && gs.charm > 60,
        weight: 30,
        effect: (gs) => {
            const energyGain = getRandomValue(15, 5);
            const popularityGain = getRandomValue(10, 3);
            const showmanshipGain = getRandomValue(10, 3);
            return {
                changes: { energy: gs.energy + energyGain, popularity: gs.popularity + popularityGain, showmanship: gs.showmanship + showmanshipGain },
                message: `높은 재능과 매력을 바탕으로 건설적인 스케줄 감사가 진행되었습니다! (+${energyGain} 에너지, +${popularityGain} 인기, +${showmanshipGain} 쇼맨십)`
            };
        }
    },
    {
        condition: (gs) => gs.resources.practice_time < gs.staff.length * 4,
        weight: 25,
        effect: (gs) => {
            const talentGain = getRandomValue(10, 3);
            const energyGain = getRandomValue(5, 2);
            return {
                changes: { talent: gs.talent + talentGain, energy: gs.energy + energyGain },
                message: `연습 시간이 부족한 상황에 대해 논의했습니다. 모두가 효율적인 스케줄 관리에 동의하며 당신의 리더십을 신뢰했습니다. (+${talentGain} 재능, +${energyGain} 에너지)`
            };
        }
    },
    {
        condition: (gs) => gs.staff.some(s => s.trust < 50),
        weight: 20,
        effect: (gs) => {
            const staff = gs.staff.find(s => s.trust < 50);
            const trustGain = getRandomValue(10, 4);
            const energyGain = getRandomValue(5, 2);
            const talentGain = getRandomValue(5, 2);
            const updatedStaff = gs.staff.map(s => s.id === staff.id ? { ...s, trust: Math.min(100, s.trust + trustGain) } : s);
            return {
                changes: { staff: updatedStaff, energy: gs.energy + energyGain, talent: gs.talent + talentGain },
                message: `스케줄 감사 중, ${staff.name}이(가) 조심스럽게 불만을 토로했습니다. 그의 의견을 존중하고 해결을 약속하자 신뢰를 얻었습니다. (+${trustGain} ${staff.name} 신뢰도, +${energyGain} 에너지, +${talentGain} 재능)`
            };
        }
    },
    {
        condition: () => true, // Default positive outcome
        weight: 20,
        effect: (gs) => {
            const popularityGain = getRandomValue(5, 2);
            const showmanshipGain = getRandomValue(3, 1);
            return {
                changes: { popularity: gs.popularity + popularityGain, showmanship: gs.showmanship + showmanshipGain },
                message: `평범한 스케줄 감사였지만, 모두가 한자리에 모여 업무를 나눈 것만으로도 의미가 있었습니다. (+${popularityGain} 인기, +${showmanshipGain} 쇼맨십)`
            };
        }
    },
    {
        condition: (gs) => gs.popularity < 40 || gs.talent < 40,
        weight: 25, // Increased weight when conditions met
        effect: (gs) => {
            const energyLoss = getRandomValue(5, 2);
            const popularityLoss = getRandomValue(5, 2);
            const showmanshipLoss = getRandomValue(5, 2);
            return {
                changes: { energy: gs.energy - energyLoss, popularity: gs.popularity - popularityLoss, showmanship: gs.showmanship - showmanshipLoss },
                message: `스케줄 감사는 길어졌지만, 의견 차이만 확인하고 끝났습니다. 스태프들의 에너지와 인기, 당신의 쇼맨십이 약간 감소했습니다. (-${energyLoss} 에너지, -${popularityLoss} 인기, -${showmanshipLoss} 쇼맨십)`
            };
        }
    }
];

const inspectCityOutcomes = [
    {
        condition: (gs) => gs.resources.practice_time < 20,
        weight: 30,
        effect: (gs) => {
            const practiceTimeGain = getRandomValue(10, 5);
            return {
                changes: { resources: { ...gs.resources, practice_time: gs.resources.practice_time + practiceTimeGain } },
                message: `활동 장소 시찰 중 새로운 연습 시간을 발견했습니다! (+${practiceTimeGain} 연습 시간)`
            };
        }
    },
    {
        condition: (gs) => gs.resources.stage_outfits < 20,
        weight: 25,
        effect: (gs) => {
            const stageOutfitsGain = getRandomValue(10, 5);
            return {
                changes: { resources: { ...gs.resources, stage_outfits: gs.resources.stage_outfits + stageOutfitsGain } },
                message: `활동 장소 시찰 중 쓸만한 무대 의상을 발견했습니다! (+${stageOutfitsGain} 무대 의상)`
            };
        }
    },
    {
        condition: () => true, // General positive discovery
        weight: 20,
        effect: (gs) => {
            const talentGain = getRandomValue(5, 2);
            const charmGain = getRandomValue(5, 2);
            return {
                changes: { talent: gs.talent + talentGain, charm: gs.charm + charmGain },
                message: `활동 장소를 시찰하며 새로운 재능과 매력을 얻었습니다. (+${talentGain} 재능, +${charmGain} 매력)`
            };
        }
    },
    {
        condition: () => true, // Always possible
        weight: 25, // Increased weight for more frequent occurrence
        effect: (gs) => {
            const actionLoss = getRandomValue(2, 1);
            const energyLoss = getRandomValue(5, 2);
            const popularityLoss = getRandomValue(5, 2);
            return {
                changes: { actionPoints: gs.actionPoints - actionLoss, energy: gs.energy - energyLoss, popularity: gs.popularity - popularityLoss },
                message: `활동 장소 시찰에 너무 깊이 빠져 행동력을 소모하고 에너지와 인기가 감소했습니다. (-${actionLoss} 행동력, -${energyLoss} 에너지, -${popularityLoss} 인기)`
            };
        }
    },
    {
        condition: () => true, // Always possible
        weight: 15, // Increased weight for more frequent occurrence
        effect: (gs) => {
            const showmanshipLoss = getRandomValue(5, 2);
            const talentLoss = getRandomValue(5, 2);
            return {
                changes: { showmanship: gs.showmanship - showmanshipLoss, talent: gs.talent - talentLoss },
                message: `활동 장소 시찰 중 예상치 못한 문제에 부딪혀 쇼맨십과 재능이 약간 감소했습니다. (-${showmanshipLoss} 쇼맨십, -${talentLoss} 재능)`
            };
        }
    }
];

const reportToCitizensOutcomes = [
    {
        condition: (gs, staff) => staff.trust < 60,
        weight: 40,
        effect: (gs, staff) => {
            const trustGain = getRandomValue(10, 5);
            const talentGain = getRandomValue(5, 2);
            const charmGain = getRandomValue(5, 2);
            const updatedStaff = gs.staff.map(s => s.id === staff.id ? { ...s, trust: Math.min(100, s.trust + trustGain) } : s);
            return {
                changes: { staff: updatedStaff, talent: gs.talent + talentGain, charm: gs.charm + charmGain },
                message: `${staff.name}${getWaGwaParticle(staff.name)} 깊은 보고를 나누며 신뢰와 당신의 매력을 얻었습니다. (+${trustGain} ${staff.name} 신뢰도, +${talentGain} 재능, +${charmGain} 매력)`
            };
        }
    },
    {
        condition: (gs, staff) => staff.personality === "꼼꼼한",
        weight: 20,
        effect: (gs, staff) => {
            const energyGain = getRandomValue(10, 3);
            const showmanshipGain = getRandomValue(5, 2);
            return {
                changes: { energy: gs.energy + energyGain, showmanship: gs.showmanship + showmanshipGain },
                message: `${staff.name}${getWaGwaParticle(staff.name)}와 꼼꼼한 보고를 나누며 에너지와 쇼맨십이 상승했습니다. (+${energyGain} 에너지, +${showmanshipGain} 쇼맨십)`
            };
        }
    },
    {
        condition: (gs, staff) => staff.skill === "스케줄 관리",
        weight: 15,
        effect: (gs, staff) => {
            const practiceTimeGain = getRandomValue(5, 2);
            return {
                changes: { resources: { ...gs.resources, practice_time: gs.resources.practice_time + practiceTimeGain } },
                message: `${staff.name}${getWaGwaParticle(staff.name)}에게서 스케줄 관리에 대한 유용한 정보를 얻어 연습 시간을 추가로 확보했습니다. (+${practiceTimeGain} 연습 시간)`
            };
        }
    },
    {
        condition: (gs, staff) => true, // Default positive outcome
        weight: 25,
        effect: (gs, staff) => {
            const popularityGain = getRandomValue(5, 2);
            const talentGain = getRandomValue(3, 1);
            return {
                changes: { popularity: gs.popularity + popularityGain, talent: gs.talent + talentGain },
                message: `${staff.name}${getWaGwaParticle(staff.name)} 소소한 보고를 나누며 인기와 당신의 재능이 조금 더 단단해졌습니다. (+${popularityGain} 인기, +${talentGain} 재능)`
            };
        }
    },
    {
        condition: (gs, staff) => gs.energy < 40 || staff.trust < 40,
        weight: 20, // Increased weight when conditions met
        effect: (gs, staff) => {
            const trustLoss = getRandomValue(10, 3);
            const energyLoss = getRandomValue(5, 2);
            const showmanshipLoss = getRandomValue(5, 2);
            const updatedStaff = gs.staff.map(s => s.id === staff.id ? { ...s, trust: Math.min(100, s.trust + trustLoss) } : s);
            return {
                changes: { staff: updatedStaff, energy: gs.energy - energyLoss, showmanship: gs.showmanship - showmanshipLoss },
                message: `스케줄 감사 중, ${staff.name}이(가) 조심스럽게 불만을 토로했습니다. 그의 의견을 존중하고 해결을 약속하자 신뢰를 얻었습니다. (+${trustGain} ${staff.name} 신뢰도, +${energyGain} 에너지, +${showmanshipLoss} 쇼맨십)`
            };
        }
    },
    {
        condition: (gs) => gs.energy < 30,
        weight: 15, // Increased weight when conditions met
        effect: (gs, staff) => {
            const actionLoss = getRandomValue(1, 0);
            const popularityLoss = getRandomValue(5, 2);
            return {
                changes: { actionPoints: gs.actionPoints - actionLoss, popularity: gs.popularity - popularityLoss },
                message: `${staff.name}${getWaGwaParticle(staff.name)} 보고가 길어졌지만, 특별한 소득은 없었습니다. 당신의 인기가 감소했습니다. (-${actionLoss} 행동력, -${popularityLoss} 인기)`
            };
        }
    }
];

function calculateMinigameReward(minigameName, score) {
    let rewards = { showmanship: 0, energy: 0, popularity: 0, talent: 0, charm: 0, message: "" };

    switch (minigameName) {
        case "팬 얼굴 순서 맞추기":
            if (score >= 51) {
                rewards.showmanship = 15;
                rewards.popularity = 10;
                rewards.energy = 5;
                rewards.charm = 5;
                rewards.message = `최고의 팬 서비스 전문가가 되셨습니다! (+15 쇼맨십, +10 인기, +5 에너지, +5 매력)`;
            } else if (score >= 21) {
                rewards.showmanship = 10;
                rewards.popularity = 5;
                rewards.energy = 3;
                rewards.message = `훌륭한 팬 서비스입니다! (+10 쇼맨십, +5 인기, +3 에너지)`;
            } else if (score >= 0) {
                rewards.showmanship = 5;
                rewards.message = `팬 얼굴 순서 맞추기를 완료했습니다. (+5 쇼맨십)`;
            } else {
                rewards.message = `팬 얼굴 순서 맞추기를 완료했지만, 아쉽게도 보상은 없습니다.`;
            }
            break;
        case "무대 위 제스처 따라하기": // Placeholder for now, but re-themed
            rewards.talent = 2;
            rewards.showmanship = 1;
            rewards.message = `무대 위 제스처 따라하기를 완료했습니다. (+2 재능, +1 쇼맨십)`;
            break;
        case "즉흥 인터뷰": // Placeholder for now, but re-themed
            rewards.charm = 2;
            rewards.popularity = 1;
            rewards.message = `즉흥 인터뷰를 완료했습니다. (+2 매력, +1 인기)`;
            break;
        case "팬 서비스 챌린지": // Placeholder for now, but re-themed
            rewards.energy = 2;
            rewards.talent = 1;
            rewards.message = `팬 서비스 챌린지를 완료했습니다. (+2 에너지, +1 재능)`;
            break;
        case "패션 코디하기": // Placeholder for now, but re-themed
            rewards.showmanship = 2;
            rewards.charm = 1;
            rewards.message = `패션 코디하기를 완료했습니다. (+2 쇼맨십, +1 매력)`;
            break;
        default:
            rewards.message = `미니게임 ${minigameName}${getEulReParticle(minigameName)} 완료했습니다.`;
            break;
    }
    return rewards;
}

const minigames = [
    {
        name: "팬 얼굴 순서 맞추기",
        description: "화면에 나타나는 팬들의 얼굴 순서를 기억하고 정확하게 입력하세요. 단계가 올라갈수록 어려워집니다!",
        start: (gameArea, choicesDiv) => {
            const fanFaces = ["팬1", "팬2", "팬3", "팬4", "팬5", "팬6", "팬7", "팬8", "팬9", "팬10"];
            gameState.minigameState = {
                currentSequence: [],
                playerInput: [],
                stage: 1,
                score: 0,
                showingSequence: false
            };
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
                <div class="fan-pad">
                    ${["팬1", "팬2", "팬3", "팬4", "팬5", "팬6", "팬7", "팬8", "팬9", "팬10"].map(face => `<button class="choice-btn fan-btn" data-value="${face}">${face}</button>`).join('')}
                    <button class="choice-btn submit-btn" data-action="submitSequence">입력 완료</button>
                    <button class="choice-btn reset-btn" data-action="resetInput">초기화</button>
                </div>
            `;
            choicesDiv.querySelectorAll('.fan-btn').forEach(button => {
                button.addEventListener('click', () => minigames[0].processAction('addInput', button.dataset.value));
            });
            choicesDiv.querySelector('.submit-btn').addEventListener('click', () => minigames[0].processAction('submitSequence'));
            choicesDiv.querySelector('.reset-btn').addEventListener('click', () => minigames[0].processAction('resetInput'));
        },
        showSequence: () => {
            gameState.minigameState.showingSequence = true;
            gameState.minigameState.currentSequence = [];
            const fanFaces = ["팬1", "팬2", "팬3", "팬4", "팬5", "팬6", "팬7", "팬8", "팬9", "팬10"];
            const sequenceLength = gameState.minigameState.stage + 2; // e.g., stage 1 -> 3 faces
            for (let i = 0; i < sequenceLength; i++) {
                gameState.minigameState.currentSequence.push(fanFaces[Math.floor(currentRandFn() * fanFaces.length)]);
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
                gameState.minigameState.playerInput.push(value);
                document.getElementById('playerInputDisplay').innerText = gameState.minigameState.playerInput.join(' ');
            } else if (actionType === 'resetInput') {
                gameState.minigameState.playerInput = [];
                document.getElementById('playerInputDisplay').innerText = '';
            } else if (actionType === 'submitSequence') {
                const correct = gameState.minigameState.currentSequence.every((face, i) => face === gameState.minigameState.playerInput[i]);

                if (correct && gameState.minigameState.playerInput.length === gameState.minigameState.currentSequence.length) {
                    gameState.minigameState.score += gameState.minigameState.currentSequence.length * 10;
                    gameState.minigameState.stage++;
                    gameState.minigameState.playerInput = [];
                    updateGameDisplay("정답입니다! 다음 단계로 넘어갑니다.");
                    minigames[0].render(document.getElementById('gameArea'), document.getElementById('gameChoices'));
                    setTimeout(() => minigames[0].showSequence(), 1500);
                } else {
                    updateGameDisplay("틀렸습니다! 게임 종료.");
                    minigames[0].end();
                }
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[0].name, gameState.minigameState.score);
            updateState({
                showmanship: gameState.showmanship + rewards.showmanship,
                energy: gameState.energy + rewards.energy,
                popularity: gameState.popularity + rewards.popularity,
                talent: gameState.talent + rewards.talent,
                charm: gameState.charm + rewards.charm,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
    {
        name: "무대 위 제스처 따라하기",
        description: "화면에 나오는 춤 동작이나 제스처를 기억하고 정확하게 따라하는 게임입니다.",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { score: 10 };
            gameArea.innerHTML = `<p>${minigames[1].description}</p><p>게임을 시작합니다!</p>`;
            choicesDiv.innerHTML = `<button class="choice-btn" onclick="minigames[1].processAction('endGame')">게임 종료</button>`;
        },
        render: function() {},
        processAction: (actionType) => {
            if (actionType === 'endGame') {
                minigames[1].end();
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[1].name, gameState.minigameState.score);
            updateState({
                talent: gameState.talent + rewards.talent,
                showmanship: gameState.showmanship + rewards.showmanship,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
    {
        name: "즉흥 인터뷰",
        description: "돌발 질문에 재치있게 답변하여 팬들의 마음을 사로잡으세요.",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { score: 15 };
            gameArea.innerHTML = `<p>${minigames[2].description}</p><p>게임을 시작합니다!</p>`;
            choicesDiv.innerHTML = `<button class="choice-btn" onclick="minigames[2].processAction('endGame')">게임 종료</button>`;
        },
        render: function() {},
        processAction: (actionType) => {
            if (actionType === 'endGame') {
                minigames[2].end();
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[2].name, gameState.minigameState.score);
            updateState({
                charm: gameState.charm + rewards.charm,
                popularity: gameState.popularity + rewards.popularity,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
    {
        name: "팬 서비스 챌린지",
        description: "팬들의 다양한 요청에 순발력 있게 대응하여 최고의 팬 서비스를 제공하세요.",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { score: 20 };
            gameArea.innerHTML = `<p>${minigames[3].description}</p><p>게임을 시작합니다!</p>`;
            choicesDiv.innerHTML = `<button class="choice-btn" onclick="minigames[3].processAction('endGame')">게임 종료</button>`;
        },
        render: function() {},
        processAction: (actionType) => {
            if (actionType === 'endGame') {
                minigames[3].end();
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[3].name, gameState.minigameState.score);
            updateState({
                energy: gameState.energy + rewards.energy,
                talent: gameState.talent + rewards.talent,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
    {
        name: "패션 코디하기",
        description: "TPO에 맞는 최고의 무대 의상을 코디하여 당신의 패션 감각을 뽐내세요.",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { score: 25 };
            gameArea.innerHTML = `<p>${minigames[4].description}</p><p>게임을 시작합니다!</p>`;
            choicesDiv.innerHTML = `<button class="choice-btn" onclick="minigames[4].processAction('endGame')">게임 종료</button>`;
        },
        render: function() {},
        processAction: (actionType) => {
            if (actionType === 'endGame') {
                minigames[4].end();
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[4].name, gameState.minigameState.score);
            updateState({
                showmanship: gameState.showmanship + rewards.showmanship,
                charm: gameState.charm + rewards.charm,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    }
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
    practice_talent: () => {
        if (!spendActionPoint()) return;

        const possibleOutcomes = inspectCityOutcomes.filter(outcome => outcome.condition(gameState));
        const totalWeight = possibleOutcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
        const rand = currentRandFn() * totalWeight;

        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(outcome => {
            cumulativeWeight += outcome.weight;
            return rand < cumulativeWeight;
        });

        if (!chosenOutcome) { // Fallback to default if something goes wrong
            chosenOutcome = inspectCityOutcomes.find(o => o.condition());
        }

        const result = chosenOutcome.effect(gameState);
        updateState({ ...result.changes, dailyActions: { ...gameState.dailyActions, practiced: true } }, result.message);
    },
    appear_on_broadcast: () => {
        if (!spendActionPoint()) return;
        const staff = gameState.staff[Math.floor(currentRandFn() * gameState.staff.length)];
        if (gameState.dailyActions.performed) { updateState({ dailyActions: { ...gameState.dailyActions, performed: true } }, `${staff.name}${getWaGwaParticle(staff.name)} 이미 충분히 방송에 출연했습니다.`); return; }

        const possibleOutcomes = reportToCitizensOutcomes.filter(outcome => outcome.condition(gameState, staff));
        const totalWeight = possibleOutcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
        const rand = currentRandFn() * totalWeight;

        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(outcome => {
            cumulativeWeight += outcome.weight;
            return rand < cumulativeWeight;
        });

        if (!chosenOutcome) { // Fallback to default if something goes wrong
            chosenOutcome = reportToCitizensOutcomes.find(o => o.condition());
        }

        const result = chosenOutcome.effect(gameState, staff);
        updateState({ ...result.changes, dailyActions: { ...gameState.dailyActions, performed: true } }, result.message);
    },
    hold_fan_meeting: () => {
        if (!spendActionPoint()) return;

        const possibleOutcomes = auditBudgetOutcomes.filter(outcome => outcome.condition(gameState));
        const totalWeight = possibleOutcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
        const rand = currentRandFn() * totalWeight;

        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(outcome => {
            cumulativeWeight += outcome.weight;
            return rand < cumulativeWeight;
        });

        if (!chosenOutcome) { // Fallback to default if something goes wrong
            chosenOutcome = auditBudgetOutcomes.find(o => o.condition());
        }

        const result = chosenOutcome.effect(gameState);
        updateState(result.changes, result.message);
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
    handle_staff_dispute: (params) => {
        if (!spendActionPoint()) return;
        const { first, second } = params;
        let message = "";
        let reward = { energy: 0, popularity: 0, talent: 0 };

        const trustGain = getRandomValue(10, 3);
        const trustLoss = getRandomValue(5, 2);
        const energyGain = getRandomValue(5, 2);
        const talentGain = getRandomValue(5, 2);

        const updatedStaff = gameState.staff.map(s => {
            if (s.id === first) {
                s.trust = Math.min(100, s.trust + trustGain);
                message += `${s.name}의 관점을 먼저 들어주었습니다. ${s.name}의 신뢰도가 상승했습니다. `;
                reward.energy += energyGain;
                reward.talent += talentGain;
            } else if (s.id === second) {
                s.trust = Math.max(0, s.trust - trustLoss);
                message += `${second}의 신뢰도가 약간 하락했습니다. `;
            }
            return s;
        });

        updateState({ ...reward, staff: updatedStaff, currentScenarioId: 'staff_dispute_resolution_result' }, message);
    },
    mediate_staff_dispute: () => {
        if (!spendActionPoint()) return;
        const popularityGain = getRandomValue(10, 3);
        const talentGain = getRandomValue(5, 2);
        const charmGain = getRandomValue(5, 2);
        const message = `당신의 효율적인 중재로 김매니저와 이스타의 의견 차이가 해결되었습니다. 팀의 인기와 당신의 매력이 강화되었습니다! (+${popularityGain} 인기, +${talentGain} 재능, +${charmGain} 매력)`;
        updateState({ popularity: gameState.popularity + popularityGain, talent: gameState.talent + talentGain, charm: gameState.charm + charmGain, currentScenarioId: 'staff_dispute_resolution_result' }, message);
    },
    ignore_event: () => {
        if (!spendActionPoint()) return;
        const popularityLoss = getRandomValue(10, 3);
        const talentLoss = getRandomValue(5, 2);
        const message = `의견 차이를 무시했습니다. 스태프들의 불만이 커지고 팀의 분위기가 침체됩니다. (-${popularityLoss} 인기, -${talentLoss} 재능)`;
        const updatedStaff = gameState.staff.map(s => {
            s.trust = Math.max(0, s.trust - 5);
            return s;
        });
        updateState({ popularity: gameState.popularity - popularityLoss, talent: gameState.talent - talentLoss, staff: updatedStaff, currentScenarioId: 'staff_dispute_resolution_result' }, message);
    },
    seek_inspiration_for_talent: () => {
        if (!spendActionPoint()) return;
        const cost = 1; // Action point cost
        let message = "";
        let changes = {};
        if (gameState.actionPoints >= cost) {
            const talentGain = getRandomValue(10, 3);
            const energyGain = getRandomValue(5, 2);
            message = `새로운 영감을 찾아 재능을 회복했습니다. 당신의 재능과 에너지가 상승합니다. (+${talentGain} 재능, +${energyGain} 에너지)`;
            changes.talent = gameState.talent + talentGain;
            changes.energy = gameState.energy + energyGain;
            changes.actionPoints = gameState.actionPoints - cost;
        } else {
            message = "재능을 회복할 행동력이 부족합니다.";
        }
        updateState({ ...changes, currentScenarioId: 'intro' }, message);
    },
    wait_for_talent_recovery: () => {
        if (!spendActionPoint()) return;
        const talentLoss = getRandomValue(10, 3);
        const energyLoss = getRandomValue(5, 2);
        updateState({ talent: gameState.talent - talentLoss, energy: gameState.energy - energyLoss, currentScenarioId: 'intro' }, `휴식을 취하며 기다렸지만, 재능과 에너지가 감소했습니다. (-${talentLoss} 재능, -${energyLoss} 에너지)`);
    },
    reconnect_with_fans: () => {
        if (!spendActionPoint()) return;
        const cost = 1; // Action point cost
        let message = "";
        let changes = {};
        if (gameState.actionPoints >= cost) {
            const charmGain = getRandomValue(10, 3);
            const popularityGain = getRandomValue(5, 2);
            message = `팬들과 적극적으로 소통하여 매력을 회복했습니다. 당신의 매력과 인기가 상승합니다. (+${charmGain} 매력, +${popularityGain} 인기)`;
            changes.charm = gameState.charm + charmGain;
            changes.popularity = gameState.popularity + popularityGain;
            changes.actionPoints = gameState.actionPoints - cost;
        } else {
            message = "팬들과 소통할 행동력이 부족합니다.";
        }
        updateState({ ...changes, currentScenarioId: 'intro' }, message);
    },
    take_personal_time: () => {
        if (!spendActionPoint()) return;
        const charmLoss = getRandomValue(10, 3);
        const popularityLoss = getRandomValue(5, 2);
        updateState({ charm: gameState.charm - charmLoss, popularity: gameState.popularity - popularityLoss, currentScenarioId: 'intro' }, `혼자만의 시간을 가졌지만, 매력과 인기가 감소했습니다. (-${charmLoss} 매력, -${popularityLoss} 인기)`);
    },
    welcome_new_unique_staff: () => {
        if (!spendActionPoint()) return;
        let message = "";
        let changes = {};
        if (gameState.staff.length < gameState.maxStaff && gameState.pendingNewStaff) {
            const energyGain = getRandomValue(10, 3);
            const popularityGain = getRandomValue(5, 2);
            const talentGain = getRandomValue(5, 2);
            gameState.staff.push(gameState.pendingNewStaff);
            message = `새로운 스태프 ${gameState.pendingNewStaff.name}을(를) 유능한 인재로 영입했습니다! 팀의 에너지와 인기, 재능이 상승합니다. (+${energyGain} 에너지, +${popularityGain} 인기, +${talentGain} 재능)`;
            changes.energy = gameState.energy + energyGain;
            changes.popularity = gameState.popularity + popularityGain;
            changes.talent = gameState.talent + talentGain;
            changes.pendingNewStaff = null;
        } else {
            message = "새로운 스태프를 영입할 수 없습니다.";
        }
        updateState({ ...changes, currentScenarioId: 'intro' }, message);
    },
    observe_staff: () => {
        if (!spendActionPoint()) return;
        let message = "";
        let changes = {};
        const rand = currentRandFn();
        if (rand < 0.7) {
            const talentGain = getRandomValue(5, 2);
            message = `새로운 스태프를 관찰하며 흥미로운 점을 발견했습니다. 당신의 재능이 상승합니다. (+${talentGain} 재능)`;
            changes.talent = gameState.talent + talentGain;
        } else {
            const energyLoss = getRandomValue(5, 2);
            message = `스태프를 관찰하는 동안, 당신의 우유부단함이 팀에 좋지 않은 인상을 주었습니다. (-${energyLoss} 에너지)`;
            changes.energy = gameState.energy - energyLoss;
        }
        changes.pendingNewStaff = null;
        updateState({ ...changes, currentScenarioId: 'intro' }, message);
    },
    reject_staff: () => {
        if (!spendActionPoint()) return;
        const energyLoss = getRandomValue(10, 3);
        const popularityLoss = getRandomValue(5, 2);
        const talentLoss = getRandomValue(5, 2);
        const message = `새로운 스태프의 영입을 거절했습니다. 팀의 에너지와 인기, 재능이 감소합니다. (-${energyLoss} 에너지, -${popularityLoss} 인기, -${talentLoss} 재능)`;
        updateState({ energy: gameState.energy - energyLoss, popularity: gameState.popularity - popularityLoss, talent: gameState.talent - talentLoss, pendingNewStaff: null, currentScenarioId: 'intro' }, message);
    },
    accept_interview: () => {
        if (!spendActionPoint()) return;
        let message = "";
        let changes = {};
        if (gameState.resources.performance_fees >= 50) {
            const fanClubMembersGain = getRandomValue(5, 2);
            message = `외부 언론과의 인터뷰를 수락하여 팬클럽 회원 수를 얻었습니다! (+${fanClubMembersGain} 팬클럽 회원 수)`;
            changes.resources = { ...gameState.resources, performance_fees: gameState.resources.performance_fees - 50, fan_club_members: (gameState.resources.fan_club_members || 0) + 5 };
            changes.fan_club_members = gameState.fan_club_members + fanClubMembersGain;
        } else {
            message = "인터뷰에 필요한 출연료가 부족합니다.";
        }
        updateState({ ...changes, currentScenarioId: 'intro' }, message);
    },
    decline_interview: () => {
        if (!spendActionPoint()) return;
        const fanClubMembersLoss = getRandomValue(5, 2);
        updateState({ fan_club_members: gameState.fan_club_members - fanClubMembersLoss, currentScenarioId: 'intro' }, `인터뷰 요청을 거절했습니다. 언론은 아쉬워하며 떠났습니다. (-${fanClubMembersLoss} 팬클럽 회원 수)`);
    },
    show_resource_management_options: () => updateState({ currentScenarioId: 'action_resource_management' }),
    show_venue_management_options: () => updateState({ currentScenarioId: 'action_venue_management' }),
    show_free_time_options: () => updateState({ currentScenarioId: 'free_time_menu' }),
    manage_practice_time: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.starLevel * 0.1) + (gameState.dailyBonus.performanceSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            const practiceTimeGain = getRandomValue(5, 2);
            message = `연습 시간을 성공적으로 관리했습니다! (+${practiceTimeGain} 연습 시간)`;
            changes.resources = { ...gameState.resources, practice_time: gameState.resources.practice_time + practiceTimeGain };
        } else {
            message = "연습 시간 관리에 실패했습니다.";
        }
        updateState(changes, message);
    },
    create_stage_outfits: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.starLevel * 0.1) + (gameState.dailyBonus.performanceSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            const stageOutfitsGain = getRandomValue(5, 2);
            message = `무대 의상을 성공적으로 제작했습니다! (+${stageOutfitsGain} 무대 의상)`;
            changes.resources = { ...gameState.resources, stage_outfits: gameState.resources.stage_outfits + stageOutfitsGain };
        } else {
            message = "무대 의상 제작에 실패했습니다.";
        }
        updateState(changes, message);
    },
    negotiate_performance_fees: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.starLevel * 0.1) + (gameState.dailyBonus.performanceSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            const performanceFeesGain = getRandomValue(5, 2);
            message = `출연료 협상을 성공적으로 완료했습니다! (+${performanceFeesGain} 출연료)`;
            changes.resources = { ...gameState.resources, performance_fees: gameState.resources.performance_fees + performanceFeesGain };
        } else {
            message = "출연료 협상에 실패했습니다.";
        }
        updateState(changes, message);
    },
    build_practiceRoom: () => {
        if (!spendActionPoint()) return;
        const cost = { practice_time: 50, stage_outfits: 20 };
        let message = "";
        let changes = {};
        if (gameState.resources.practice_time >= cost.practice_time && gameState.resources.stage_outfits >= cost.stage_outfits) {
            gameState.activityVenues.practiceRoom.built = true;
            const talentGain = getRandomValue(10, 3);
            message = `연습실을 구축했습니다! (+${talentGain} 재능)`;
            changes.talent = gameState.talent + talentGain;
            changes.resources = { ...gameState.resources, practice_time: gameState.resources.practice_time - cost.practice_time, stage_outfits: gameState.resources.stage_outfits - cost.stage_outfits };
        } else {
            message = "자원이 부족하여 구축할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_broadcastStudio: () => {
        if (!spendActionPoint()) return;
        const cost = { stage_outfits: 30, performance_fees: 30 };
        let message = "";
        let changes = {};
        if (gameState.resources.stage_outfits >= cost.stage_outfits && gameState.resources.performance_fees >= cost.performance_fees) {
            gameState.activityVenues.broadcastStudio.built = true;
            const showmanshipGain = getRandomValue(10, 3);
            message = `방송 스튜디오를 구축했습니다! (+${showmanshipGain} 쇼맨십)`;
            changes.showmanship = gameState.showmanship + showmanshipGain;
            changes.resources = { ...gameState.resources, stage_outfits: gameState.resources.stage_outfits - cost.stage_outfits, performance_fees: gameState.resources.performance_fees - cost.performance_fees };
        } else {
            message = "자원이 부족하여 구축할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_concertHall: () => {
        if (!spendActionPoint()) return;
        const cost = { practice_time: 100, stage_outfits: 50, performance_fees: 50 };
        let message = "";
        let changes = {};
        if (gameState.resources.practice_time >= cost.practice_time && gameState.resources.stage_outfits >= cost.stage_outfits && gameState.resources.performance_fees >= cost.performance_fees) {
            gameState.activityVenues.concertHall.built = true;
            const popularityGain = getRandomValue(20, 5);
            const energyGain = getRandomValue(20, 5);
            message = `콘서트 홀을 구축했습니다! (+${popularityGain} 인기, +${energyGain} 에너지)`;
            changes.popularity = gameState.popularity + popularityGain;
            changes.energy = gameState.energy + energyGain;
            changes.resources = { ...gameState.resources, practice_time: gameState.resources.practice_time - cost.practice_time, stage_outfits: gameState.resources.stage_outfits - cost.stage_outfits, performance_fees: gameState.resources.performance_fees - cost.performance_fees };
        } else {
            message = "자원이 부족하여 구축할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_fanClub: () => {
        if (!spendActionPoint()) return;
        const cost = { stage_outfits: 80, performance_fees: 40 };
        let message = "";
        let changes = {};
        if (gameState.resources.stage_outfits >= cost.stage_outfits && gameState.resources.performance_fees >= cost.performance_fees) {
            gameState.activityVenues.fanClub.built = true;
            const charmGain = getRandomValue(15, 5);
            const popularityGain = getRandomValue(10, 3);
            message = `팬클럽을 구축했습니다! (+${charmGain} 매력, +${popularityGain} 인기)`;
            changes.charm = gameState.charm + charmGain;
            changes.popularity = gameState.popularity + popularityGain;
            changes.resources = { ...gameState.resources, stage_outfits: gameState.resources.stage_outfits - cost.stage_outfits, performance_fees: gameState.resources.performance_fees - cost.performance_fees };
        } else {
            message = "자원이 부족하여 구축할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_fashionStudio: () => {
        if (!spendActionPoint()) return;
        const cost = { stage_outfits: 50, performance_fees: 100 };
        let message = "";
        let changes = {};
        if (gameState.resources.stage_outfits >= cost.stage_outfits && gameState.resources.performance_fees >= cost.performance_fees) {
            gameState.activityVenues.fashionStudio.built = true;
            message = "패션 스튜디오를 구축했습니다!";
            changes.resources = { ...gameState.resources, stage_outfits: gameState.resources.stage_outfits - cost.stage_outfits, performance_fees: gameState.resources.performance_fees - cost.performance_fees };
        } else {
            message = "자원이 부족하여 구축할 수 없습니다.";
        }
        updateState(changes, message);
    },
    maintain_venue: (params) => {
        if (!spendActionPoint()) return;
        const venueKey = params.venue;
        const cost = { stage_outfits: 10, performance_fees: 10 };
        let message = "";
        let changes = {};
        if (gameState.resources.stage_outfits >= cost.stage_outfits && gameState.resources.performance_fees >= cost.performance_fees) {
            gameState.activityVenues[venueKey].durability = 100;
            message = `${gameState.activityVenues[venueKey].name} 활동 장소의 보수를 완료했습니다. 내구도가 100으로 회복되었습니다.`;
            changes.resources = { ...gameState.resources, stage_outfits: gameState.resources.stage_outfits - cost.stage_outfits, performance_fees: gameState.resources.performance_fees - cost.performance_fees };
        } else {
            message = "보수에 필요한 자원이 부족합니다.";
        }
        updateState(changes, message);
    },
    spontaneous_performance: () => {
        if (!spendActionPoint()) return;
        let message = "";
        let changes = {};
        const rand = currentRandFn();

        if (rand < 0.1) { // Big Win
            const practiceTimeGain = getRandomValue(30, 10);
            const stageOutfitsGain = getRandomValue(20, 5);
            const performanceFeesGain = getRandomValue(15, 5);
            message = `즉흥 공연 대성공! 엄청난 자원을 얻었습니다! (+${practiceTimeGain} 연습 시간, +${stageOutfitsGain} 무대 의상, +${performanceFeesGain} 출연료)`;
            changes.resources = { ...gameState.resources, practice_time: gameState.resources.practice_time + practiceTimeGain, stage_outfits: gameState.resources.stage_outfits + stageOutfitsGain, performance_fees: gameState.resources.performance_fees + performanceFeesGain };
        } else if (rand < 0.4) { // Small Win
            const showmanshipGain = getRandomValue(10, 5);
            message = `즉흥 공연 성공! 쇼맨십이 향상됩니다. (+${showmanshipGain} 쇼맨십)`;
            changes.showmanship = gameState.showmanship + showmanshipGain;
        } else if (rand < 0.7) { // Small Loss
            const showmanshipLoss = getRandomValue(5, 2);
            message = `아쉽게도 공연 실패! 쇼맨십이 조금 떨어집니다. (-${showmanshipLoss} 쇼맨십)`;
            changes.showmanship = gameState.showmanship - showmanshipLoss;
        } else { // No Change
            message = `즉흥 공연 결과는 아무것도 아니었습니다.`;
        }
        updateState({ ...changes, currentScenarioId: 'free_time_menu' }, message);
    },
    fan_interaction_event: () => {
        if (!spendActionPoint()) return;
        let message = "";
        let changes = {};
        const rand = currentRandFn();

        if (rand < 0.2) { // Big Catch (Fan Club Members)
            const fanClubMembersGain = getRandomValue(3, 1);
            message = `팬들과 소통 대성공! 팬클럽 회원 수가 증가했습니다! (+${fanClubMembersGain} 팬클럽 회원 수)`;
            changes.resources = { ...gameState.resources, fan_club_members: (gameState.resources.fan_club_members || 0) + fanClubMembersGain };
        } else if (rand < 0.6) { // Normal Catch (Performance Fees)
            const performanceFeesGain = getRandomValue(10, 5);
            message = `출연료를 얻었습니다! (+${performanceFeesGain} 출연료)`;
            changes.resources = { ...gameState.resources, performance_fees: gameState.resources.performance_fees + performanceFeesGain };
        } else { // No Change
            message = `아쉽게도 아무것도 얻지 못했습니다.`;
        }
        updateState({ ...changes, currentScenarioId: 'free_time_menu' }, message);
    },
    return_to_intro: () => updateState({ currentScenarioId: 'intro' }),
    play_minigame: () => {
        if (gameState.dailyActions.minigamePlayed) { updateGameDisplay("오늘의 무대는 이미 플레이했습니다."); return; }
        if (!spendActionPoint()) return;

        const minigameIndex = (gameState.day - 1) % minigames.length;
        const minigame = minigames[minigameIndex];

        gameState.currentScenarioId = `minigame_${minigame.name}`;

        updateState({ dailyActions: { ...gameState.dailyActions, minigamePlayed: true } }); 

        updateGameDisplay(minigame.description);
        minigame.start(document.getElementById('gameArea'), document.getElementById('gameChoices'));
    },
    show_resource_management_options: () => updateState({ currentScenarioId: 'action_resource_management' }),
    show_venue_management_options: () => updateState({ currentScenarioId: 'action_venue_management' }),
    show_free_time_options: () => updateState({ currentScenarioId: 'free_time_menu' }),
};

function applyStatEffects() {
    let message = "";
    // High Showmanship: Resource management success chance increase
    if (gameState.showmanship >= 70) {
        gameState.dailyBonus.performanceSuccess += 0.1;
        message += "높은 쇼맨십 덕분에 활동 자원 관리 성공률이 증가합니다. ";
    }
    // Low Showmanship: Energy decrease
    if (gameState.showmanship < 30) {
        gameState.energy = Math.max(0, gameState.energy - getRandomValue(5, 2));
        message += "쇼맨십 부족으로 에너지가 감소합니다. ";
    }

    // High Energy: Action points increase
    if (gameState.energy >= 70) {
        gameState.maxActionPoints += 1;
        gameState.actionPoints = gameState.maxActionPoints;
        message += "넘치는 에너지 덕분에 행동력이 증가합니다. ";
    }
    // Low Energy: Action points decrease
    if (gameState.energy < 30) {
        gameState.maxActionPoints = Math.max(5, gameState.maxActionPoints - 1);
        gameState.actionPoints = Math.min(gameState.actionPoints, gameState.maxActionPoints);
        message += "에너지 부족으로 행동력이 감소합니다. ";
    }

    // High Popularity: Talent and Charm boost
    if (gameState.popularity >= 70) {
        const talentGain = getRandomValue(5, 2);
        const charmGain = getRandomValue(5, 2);
        gameState.talent = Math.min(100, gameState.talent + talentGain);
        gameState.charm = Math.min(100, gameState.charm + charmGain);
        message += `당신의 높은 인기 덕분에 재능과 매력이 향상됩니다! (+${talentGain} 재능, +${charmGain} 매력) `;
    }
    // Low Popularity: Talent and Charm decrease
    if (gameState.popularity < 30) {
        const talentLoss = getRandomValue(5, 2);
        const charmLoss = getRandomValue(5, 2);
        gameState.talent = Math.max(0, gameState.talent - talentLoss);
        gameState.charm = Math.max(0, gameState.charm - charmLoss);
        message += "인기 부족으로 재능과 매력이 흐려집니다. (-${talentLoss} 재능, -${charmLoss} 매력) ";
    }

    // High Talent: Showmanship boost or rare resource discovery
    if (gameState.talent >= 70) {
        const showmanshipGain = getRandomValue(5, 2);
        gameState.showmanship = Math.min(100, gameState.showmanship + showmanshipGain);
        message += "당신의 뛰어난 재능 덕분에 새로운 쇼맨십을 불러일으킵니다. (+${showmanshipGain} 쇼맨십) ";
        if (currentRandFn() < 0.2) { // 20% chance for fan club members discovery
            const amount = getRandomValue(1, 1);
            gameState.resources.fan_club_members += amount;
            message += `팬클럽 회원 수를 발견했습니다! (+${amount} 팬클럽 회원 수) `;
        }
    }
    // Low Talent: Showmanship decrease or action point loss
    if (gameState.talent < 30) {
        const showmanshipLoss = getRandomValue(5, 2);
        gameState.showmanship = Math.max(0, gameState.showmanship - showmanshipLoss);
        message += "재능 부족으로 쇼맨십이 감소합니다. (-${showmanshipLoss} 쇼맨십) ";
        if (currentRandFn() < 0.1) { // 10% chance for action point loss
            const actionLoss = getRandomValue(1, 0);
            gameState.actionPoints = Math.max(0, gameState.actionPoints - actionLoss);
            message += "비효율적인 연습으로 행동력을 낭비했습니다. (-${actionLoss} 행동력) ";
        }
    }

    // High Charm: Staff trust increase
    if (gameState.charm >= 70) {
        gameState.staff.forEach(s => s.trust = Math.min(100, s.trust + getRandomValue(2, 1)));
        message += "높은 매력 덕분에 스태프들의 신뢰가 깊어집니다. ";
    }
    // Low Charm: Staff trust decrease
    if (gameState.charm < 30) {
        gameState.staff.forEach(s => s.trust = Math.max(0, s.trust - getRandomValue(5, 2)));
        message += "낮은 매력으로 인해 스태프들의 신뢰가 하락합니다. ";
    }

    return message;
}

function generateRandomStaff() {
    const names = ["제이콥", "카일리", "리암", "미아", "노아"];
    const personalities = ["현실적", "꼼꼼한", "창의적", "열정적"];
    const skills = ["스케줄 관리", "이미지 메이킹", "작곡"];
    const randomId = Math.random().toString(36).substring(2, 9);

    return {
        id: randomId,
        name: names[Math.floor(currentRandFn() * names.length)],
        personality: personalities[Math.floor(currentRandFn() * personalities.length)],
        skill: skills[Math.floor(currentRandFn() * skills.length)],
        trust: 50
    };
}

// --- Daily/Initialization Logic ---
const weightedDailyEvents = [
    { id: "daily_event_street_performance", weight: 10, condition: () => true, onTrigger: () => {
        const popularityGain = getRandomValue(10, 5);
        gameScenarios.daily_event_street_performance.text = `깜짝 길거리 공연으로 인기가 증가합니다! (+${popularityGain} 인기)`;
        updateState({ popularity: gameState.popularity + popularityGain });
    } },
    { id: "daily_event_scandal", weight: 10, condition: () => true, onTrigger: () => {
        const popularityLoss = getRandomValue(10, 5);
        gameScenarios.daily_event_scandal.text = `경쟁 연예인과의 스캔들로 인기가 감소합니다. (-${popularityLoss} 인기)`;
        updateState({ popularity: Math.max(0, gameState.popularity - popularityLoss) });
    } },
    { id: "daily_event_sponsorship", weight: 7, condition: () => true, onTrigger: () => {
        const performanceFeesGain = getRandomValue(10, 5);
        gameScenarios.daily_event_sponsorship.text = `새로운 의상 협찬으로 출연료가 증가합니다! (+${performanceFeesGain} 출연료)`;
        updateState({ resources: { ...gameState.resources, performance_fees: gameState.resources.performance_fees + performanceFeesGain } });
    } },
    { id: "daily_event_fan_gift", weight: 7, condition: () => true, onTrigger: () => {
        const charmGain = getRandomValue(5, 2);
        gameScenarios.daily_event_fan_gift.text = `팬들의 선물로 매력이 증가합니다! (+${charmGain} 매력)`;
        updateState({ charm: gameState.charm + charmGain });
    } },
    { id: "daily_event_staff_dispute", weight: 15, condition: () => gameState.staff.length >= 2 },
    { id: "daily_event_new_staff", weight: 10, condition: () => gameState.activityVenues.concertHall.built && gameState.staff.length < gameState.maxStaff, onTrigger: () => {
        const newStaff = generateRandomStaff();
        gameState.pendingNewStaff = newStaff;
        gameScenarios["daily_event_new_staff"].text = `새로운 스태프 ${newStaff.name}(${newStaff.personality}, ${newStaff.skill})이(가) 팀에 합류하고 싶어 합니다. (현재 스태프 수: ${gameState.staff.length} / ${gameState.maxStaff})`;
    }},
    { id: "daily_event_media_interview", weight: 10, condition: () => gameState.activityVenues.broadcastStudio.built },
    { id: "daily_event_talent_crisis", weight: 12, condition: () => gameState.talent < 50 },
    { id: "daily_event_charm_decline", weight: 12, condition: () => gameState.charm < 50 },
];

function processDailyEvents() {
    if (gameState.dailyEventTriggered) return;
    currentRandFn = mulberry32(getDailySeed() + gameState.day);

    // Reset daily actions and action points
    updateState({
        actionPoints: 10, // Reset to base maxActionPoints
        maxActionPoints: 10, // Reset maxActionPoints to base
        dailyActions: { practiced: false, performed: false, metFans: false, minigamePlayed: false },
        dailyEventTriggered: true,
        dailyBonus: { performanceSuccess: 0 } // Reset daily bonus
    });

    // Apply stat effects
    const statEffectMessage = applyStatEffects();

    let skillBonusMessage = "";
    let durabilityMessage = "";

    // Daily skill bonus & durability decay
    gameState.staff.forEach(s => {
        if (s.skill === '스케줄 관리') { gameState.resources.practice_time++; skillBonusMessage += `${s.name}의 스케줄 관리 기술 덕분에 연습 시간을 추가로 얻었습니다. `; }
        else if (s.skill === '이미지 메이킹') { gameState.resources.stage_outfits++; skillBonusMessage += `${s.name}의 이미지 메이킹 기술 덕분에 무대 의상을 추가로 얻었습니다. `; }
        else if (s.skill === '작곡') { gameState.resources.performance_fees++; skillBonusMessage += `${s.name}의 작곡 기술 덕분에 출연료를 추가로 얻었습니다. `; }
    });

    Object.keys(gameState.activityVenues).forEach(key => {
        const venue = gameState.activityVenues[key];
        if(venue.built) {
            venue.durability -= 1;
            if(venue.durability <= 0) {
                venue.built = false;
                durabilityMessage += `${key} 활동 장소가 파손되었습니다! 보수가 필요합니다. `; 
            }
        }
    });

    gameState.resources.practice_time -= gameState.staff.length * 2; // Practice time consumption
    let dailyMessage = "새로운 날이 시작되었습니다. ";
    dailyMessage += statEffectMessage + skillBonusMessage + durabilityMessage;
    if (gameState.resources.practice_time < 0) {
        gameState.energy -= 10;
        dailyMessage += "연습 시간이 부족하여 스태프들이 힘들어합니다! (-10 에너지)";
    } else {
        dailyMessage += "";
    }

    // Check for game over conditions
    if (gameState.showmanship <= 0) { gameState.currentScenarioId = "game_over_showmanship"; }
    else if (gameState.energy <= 0) { gameState.currentScenarioId = "game_over_energy"; }
    else if (gameState.popularity <= 0) { gameState.currentScenarioId = "game_over_popularity"; }
    else if (gameState.talent <= 0) { gameState.currentScenarioId = "game_over_talent"; }
    else if (gameState.charm <= 0) { gameState.currentScenarioId = "game_over_charm"; }
    else if (gameState.resources.practice_time < -(gameState.staff.length * 5)) { gameState.currentScenarioId = "game_over_resources"; }

    // --- New Weighted Random Event Logic ---
    let eventId = "intro";
    const possibleEvents = weightedDailyEvents.filter(event => !event.condition || event.condition());
    const totalWeight = possibleEvents.reduce((sum, event) => sum + event.weight, 0);
    const rand = currentRandFn() * totalWeight;

    let cumulativeWeight = 0;
    let chosenEvent = null;

    for (const event of possibleEvents) {
        cumulativeWeight += event.weight;
        if (rand < cumulativeWeight) {
            chosenEvent = event;
            break;
        }
    }

    if (chosenEvent) {
        eventId = chosenEvent.id;
        if (chosenEvent.onTrigger) {
            chosenEvent.onTrigger();
        }
    }

    gameState.currentScenarioId = eventId;
    updateGameDisplay(dailyMessage + (gameScenarios[eventId]?.text || ''));
    renderChoices(gameScenarios[eventId].choices);
    saveGameState();
}

function initDailyGame() {
    loadGameState();
}

function resetGame() {
    if (confirm("정말로 슈퍼스타의 꿈을 포기하시겠습니까? 모든 노력이 사라집니다.")) {
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