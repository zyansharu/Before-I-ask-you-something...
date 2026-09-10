const dateInput = document.querySelector('#dateInput');
const suggestionBox = document.querySelector('#suggestionBox');
const suggestionInput = document.querySelector('#suggestionInput');
const backgroundAudio = document.querySelector('#backgroundAudio');
const clickAudio = document.querySelector('#clickAudio');
const happyAudio = document.querySelector('#happyAudio');
const googleWebAppUrl = 'https://script.google.com/macros/s/AKfycbyf7qVJV3MgQ-sm5lpwmmal0bYsVH7p6SX9psK7jJfwKkVZpgRYq9cpKA9-QgS_SfSy0A/exec';
const sessionId = window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const backgroundVolume = 0.34;
const duckedBackgroundVolume = 0.12;

function getDeviceLabel() {
	return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ? 'Mobile' : 'PC';
}

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

function stopBackgroundAudio() {
	backgroundAudio.pause();
	happyAudio.pause();
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

function sendToGoogleSheet(eventType, extra = {}) {
	const activeStep = document.querySelector('.step.active')?.id || 'unknown';
	const payload = {
		id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
		timestamp: new Date().toISOString(),
		sessionId,
		eventType,
		activeStep,
		optionText: extra.optionText || '',
		typedText: extra.typedText || '',
		suggestionText: extra.suggestionText || extra.typedText || '',
		selectedDate: extra.selectedDate || '',
		selectedPlan: extra.selectedPlan || '',
		buttonText: extra.buttonText || '',
		messageText: extra.messageText || '',
		elementTag: extra.elementTag || '',
		elementLabel: extra.elementLabel || '',
		device: getDeviceLabel(),
		rawEvent: { ...extra, eventType, activeStep }
	};

	fetch(googleWebAppUrl, {
		method: 'POST',
		mode: 'no-cors',
		headers: {
			'Content-Type': 'text/plain;charset=utf-8'
		},
		body: JSON.stringify(payload)
	}).catch((error) => {
		console.error('Google Sheets send failed:', error);
	});
}

function sendToBackend(eventType, extra = {}) {
	sendToGoogleSheet(eventType, extra);
}

function collectElementDetails(element) {
	if (!element) return {};
	const tagName = element.tagName || '';
	const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
	const label = element.getAttribute('aria-label') || element.dataset.label || element.name || element.id || text || '';
	return {
		elementTag: tagName,
		elementId: element.id || '',
		elementClass: (element.className || '').toString().trim(),
		elementText: text,
		elementLabel: label,
		elementValue: element.value || '',
		elementName: element.name || ''
	};
}

function logPublicInteraction(eventType, eventObject, details = {}) {
	const target = eventObject.target;
	if (!target || !document.body.contains(target)) return;
	const payload = {
		...collectElementDetails(target),
		...details,
		buttonText: details.buttonText || (target.textContent || '').replace(/\s+/g, ' ').trim(),
		eventType,
		currentStep: document.querySelector('.step.active')?.id || 'unknown'
	};
	sendToBackend(eventType, payload);
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
	const suggestionButton = event.target.closest('#suggestionBox');
	const suggestionText = suggestionButton ? document.querySelector('#suggestionInput')?.value.trim() || '' : '';
	logPublicInteraction('public_click', event, {
		clickX: event.clientX,
		clickY: event.clientY,
		typedText: suggestionText,
		suggestionText,
		targetPath: event.composedPath ? event.composedPath().slice(0, 5).map((node) => node.tagName || node.id || node.className || 'root').join(' > ') : ''
	});
}, { capture: true });

document.addEventListener('submit', (event) => {
	const form = event.target;
	logPublicInteraction('public_submit', event, {
		formId: form.id || '',
		formName: form.name || '',
		formAction: form.action || '',
		formMethod: form.method || ''
	});
}, { capture: true });

document.addEventListener('visibilitychange', () => {
	if (document.visibilityState === 'hidden') {
		stopBackgroundAudio();
	} else {
		startBackgroundAudio();
	}
});

window.addEventListener('pagehide', stopBackgroundAudio);
startBackgroundAudio();

const no = document.querySelector('#no');

function dodgeNo() {
	const x = Math.random() * 260 - 130;
	const y = Math.random() * 72 - 36;
	no.style.transform = `translate(${x}px, ${y}px)`;
}

if (no) {
	no.addEventListener('pointerenter', dodgeNo);
	no.addEventListener('touchstart', dodgeNo, { passive: true });
	no.addEventListener('click', () => {
		attempts += 1;
		no.textContent = noLines[(attempts - 1) % noLines.length];
		sendToBackend('no_click', { buttonText: no.textContent.trim(), attemptNumber: attempts });
		dodgeNo();
	});
}

document.querySelector('#yes')?.addEventListener('click', () => {
	sendToBackend('yes_click', { buttonText: 'Yes' });
	showStep('#step-yay');
});

document.querySelector('#continue')?.addEventListener('click', () => {
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
		const suggestionText = suggestionInput.value.trim();
		sendToBackend('suggestion_typing', { typedText: suggestionText, suggestionText });
	});
}

if (suggestionBox) {
	suggestionBox.addEventListener('click', () => {
		const suggestionText = suggestionInput ? suggestionInput.value.trim() : '';
		sendToBackend('suggestion_submit', { typedText: suggestionText, suggestionText });
		showStep('#step-nervous');
	});
}

document.querySelector('#dateContinue')?.addEventListener('click', () => {
	if (!dateInput.value) { dateInput.focus(); sendToBackend('date_missing'); return; }
	sendToBackend('date_continue', { selectedDate: dateInput.value });
	showStep('#step-plan');
});

document.querySelectorAll('.options .option').forEach((option) => option.addEventListener('click', () => {
	document.querySelectorAll('.option').forEach((item) => item.classList.remove('selected'));
	option.classList.add('selected');
	selectedPlan = option.textContent.trim();
	sendToBackend('plan_option_selected', { optionText: selectedPlan });
}));

document.querySelector('#lock')?.addEventListener('click', () => {
	const readableDate = new Date(`${dateInput.value}T12:00:00`).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
	document.querySelector('#summary').innerHTML = `<strong>${readableDate}</strong><br>${selectedPlan}`;
	sendToBackend('plan_locked', { selectedDate: dateInput.value, selectedPlan });
	showStep('#step-final');
});

document.querySelector('#message')?.addEventListener('click', () => {
	const text = 'Chalo date pr chalein !!!!!';
	sendToBackend('whatsapp_message_click', { messageText: text });
	window.location.href = `https://wa.me/8801871700248?text=${encodeURIComponent(text)}`;
});

window.addEventListener('beforeunload', () => {
	stopBackgroundAudio();
	sendToBackend('page_unload', { sessionId, finalSelectedPlan: selectedPlan });
});

