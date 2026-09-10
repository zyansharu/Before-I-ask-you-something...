const dateInput = document.querySelector('#dateInput');
const suggestionBox = document.querySelector('#suggestionBox');
const suggestionInput = document.querySelector('#suggestionInput');
const backgroundAudio = document.querySelector('#backgroundAudio');
const clickAudio = document.querySelector('#clickAudio');
const happyAudio = document.querySelector('#happyAudio');
const BACKEND_URL = '/api/collect';
const sessionId = window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const backgroundVolume = 0.34;
const duckedBackgroundVolume = 0.12;

function playAudio(audio) {
	audio.currentTime = 0;
	const playback = audio.play();
	if (playback) playback.catch(() => {});
}

function startBackgroundAudio() {
	const isHappyStep = document.querySelector('.step.active')?.id === 'step-yay';
	backgroundAudio.volume = isHappyStep ? duckedBackgroundVolume : backgroundVolume;
	const playback = backgroundAudio.play();
	if (playback) playback.catch(() => {});
}

function updateSectionAudio(nextStepId) {
	const isHappyStep = nextStepId === 'step-yay';
	backgroundAudio.volume = isHappyStep ? duckedBackgroundVolume : backgroundVolume;
	if (isHappyStep) {
		playAudio(happyAudio);
	} else {
		happyAudio.pause();
		happyAudio.currentTime = 0;
	}
}

const noLines = [
	'Maybe another day? ♡',
	'No worries, Fariha ♡',
	'A tiny rain check?',
	'That is okay too ♡',
	'Your hamster understands 🐹',
	'I will save the snacks',
	'No pressure, pretty girl ♡',
	'You can think about it',
	'Maybe after one more smile?',
	'Your answer is safe with me',
	'Okay, little shy one ♡',
	'I will wait patiently',
	'Perhaps another cute day?',
	'No is still adorable',
	'Take your time, Fariha',
	'Your hamster can vote too',
	'I will keep the plan cozy',
	'One day, maybe?',
	'You are still my favourite',
	'No hard feelings, promise ♡',
	'We can call it a rain check',
	'Your comfort comes first',
	'Okay, I will behave',
	'But the snacks are waiting',
	'You make even no sound cute',
	'How about a tiny maybe?',
	'I will ask again very sweetly',
	'Your hamster says hi',
	'Whenever you are ready ♡',
	'You are worth the wait'
];
let attempts = 0;
let selectedPlan = 'A surprise plan';

function buildPayload(eventType, extra = {}) {
	const activeStep = document.querySelector('.step.active')?.id || 'unknown';
	return {
		sessionId,
		eventType,
		activeStep,
		timestamp: new Date().toISOString(),
		...extra
	};
}

async function sendToBackend(eventType, extra = {}) {
	const payload = buildPayload(eventType, extra);
	try {
		await fetch(BACKEND_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
	} catch (error) {
		console.error('Backend logging failed:', error);
	}
}

function showStep(id) {
	document.querySelectorAll('.step').forEach((step) => step.classList.remove('active'));
	document.querySelector(id).classList.add('active');
	updateSectionAudio(id.slice(1));
}

document.addEventListener('pointerdown', (event) => {
	startBackgroundAudio();
}, { capture: true });
document.addEventListener('click', (event) => {
	if (event.target.closest('button')) playAudio(clickAudio);
}, { capture: true });
startBackgroundAudio();

const no = document.querySelector('#no');

function dodgeNo() {
	const x = Math.random() * 260 - 130;
	const y = Math.random() * 72 - 36;
	no.style.transform = `translate(${x}px, ${y}px)`;
}

no.addEventListener('pointerenter', dodgeNo);
no.addEventListener('touchstart', dodgeNo, { passive: true });
no.addEventListener('click', () => {
	attempts += 1;
	no.textContent = noLines[(attempts - 1) % noLines.length];
	sendToBackend('no_click', { buttonText: no.textContent.trim(), attemptNumber: attempts });
	dodgeNo();
});

document.querySelector('#yes').addEventListener('click', () => {
	sendToBackend('yes_click', { buttonText: 'Yes' });
	showStep('#step-yay');
});
document.querySelector('#continue').addEventListener('click', () => {
	sendToBackend('continue_click', { buttonText: 'Press to continue' });
	showStep('#step-date');
});
document.querySelectorAll('.next-question').forEach((button) => button.addEventListener('click', () => {
	sendToBackend('next_question_click', { buttonText: button.textContent.trim(), nextStep: button.dataset.next || null });
	showStep(`#${button.dataset.next}`);
}));
document.querySelectorAll('.question-options .option').forEach((option) => option.addEventListener('click', () => {
	option.parentElement.querySelectorAll('.option').forEach((item) => item.classList.remove('selected'));
	option.classList.add('selected');
	const currentStep = option.closest('.step').id;
	sendToBackend('question_option_selected', { optionText: option.textContent.trim(), currentStep });
	const nextSteps = {
		'step-about': 'step-crush',
		'step-crush': 'step-understand',
		'step-understand': 'step-speaking',
		'step-favourite': 'step-suggestion',
		'step-speaking': 'step-profile',
		'step-profile': 'step-favourite'
	};
	if (nextSteps[currentStep]) showStep(`#${nextSteps[currentStep]}`);
}));

if (suggestionInput) {
	suggestionInput.addEventListener('input', () => {
		sendToBackend('suggestion_typing', { typedText: suggestionInput.value.trim() });
	});
}

suggestionBox.addEventListener('click', () => {
	const typedText = suggestionInput ? suggestionInput.value.trim() : '';
	sendToBackend('suggestion_submit', { typedText });
	showStep('#step-nervous');
});
document.querySelector('#dateContinue').addEventListener('click', () => {
	if (!dateInput.value) { dateInput.focus(); sendToBackend('date_missing'); return; }
	sendToBackend('date_continue', { selectedDate: dateInput.value });
	showStep('#step-plan');
});
document.querySelectorAll('.option').forEach((option) => option.addEventListener('click', () => {
	document.querySelectorAll('.option').forEach((item) => item.classList.remove('selected'));
	option.classList.add('selected');
	selectedPlan = option.textContent.trim();
	sendToBackend('plan_option_selected', { optionText: selectedPlan });
}));
document.querySelector('#lock').addEventListener('click', () => {
	const readableDate = new Date(`${dateInput.value}T12:00:00`).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
	document.querySelector('#summary').innerHTML = `<strong>${readableDate}</strong><br>${selectedPlan}`;
	sendToBackend('plan_locked', { selectedDate: dateInput.value, selectedPlan });
	showStep('#step-final');
});

document.querySelector('#message').addEventListener('click', () => {
	const text = 'Chalo date pr chalein !!!!!';
	sendToBackend('whatsapp_message_click', { messageText: text });
	window.location.href = `https://wa.me/8801871700248?text=${encodeURIComponent(text)}`;
});

window.addEventListener('beforeunload', () => {
	sendToBackend('page_unload', { sessionId, finalSelectedPlan: selectedPlan });
});

