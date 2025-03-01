(async function () {
	// Config variables & default values
	let _refreshing = false,
		_isOffline = false,
		_isVisible = true,
		_askUserWhenSwUpdated = true,
		_swUrl = '',
		_msgOffline = '',
		_msgWhenUpdate = '',
		_msgWhenSwUpdated = '',
		_preCache = '';

	/**
	 * Config Script
	 * @param {*} config 
	 */
	function initConfig(config) {
		_swUrl = config.swUrl;
		_msgOffline = config.msgOffline;
		_msgWhenUpdate = config.msgWhenUpdate;
		_msgWhenSwUpdated = config.msgWhenSwUpdated;
		_preCache = config.preCache;
		_askUserWhenSwUpdated = config.askUserWhenSwUpdated;
	}

	/**
	 * Service worker registration & Update Process
	 */
	function serviceWorkerRegistration() {
		if (!navigator.serviceWorker) return;

		// listen for the controlling service worker changing
		// and reload the page
		if (_preCache === 'onReload') {
			navigator.serviceWorker.addEventListener('controllerchange', () => {
				if (_refreshing) return;

				window.location.reload();
				_refreshing = true;
			});
		}

		return navigator.serviceWorker
			.register(_swUrl, {
				scope: '/'
			})
			.then((reg) => {
				console.log('Service Worker Registered');
				console.log('MNPWA service worker ready');

				// Send the urls array to the service worker
				if (_preCache === 'onAnalyzePage') {
					if (reg.installing) {
						// console.log('preCache: onAnalyzePage');
						reg.installing.postMessage({
							action: 'set-preCache',
							urls: getAllCssJsImgFromPage()
						});
					}
				}

				// if there's no controller, this page wasn't loaded
				// via a service worker, so they're looking at the latest version.
				// In that case, exit early
				if (!navigator.serviceWorker.controller) return;

				// if there's an updated worker already waiting, call
				// _updateReady()
				if (reg.waiting) {
					updateReady(reg);
					return;
				}

				// if there's an updated worker installing, track its
				// progress. If it becomes "installed", call
				// _updateReady()
				if (reg.installing) {
					trackingprogressInstalled(reg.installing);
					return;
				}

				// otherwise, listen for new installing workers arriving.
				// If one arrives, track its progress.
				// If it becomes "installed", call
				// _updateReady()
				reg.addEventListener('updatefound', () => {
					trackingprogressInstalled(reg.installing);
				});
			})
			.catch((error) => console.log('Service worker not registered: ', error));
	}

	/**
	 * Update notification Service Worker
	 * @param {Object} worker 
	 */
	function updateReady(worker) {
		let ok = true; // default value
		if (_askUserWhenSwUpdated) ok = confirm(_msgWhenSwUpdated);

		if (ok) {
			worker.postMessage({
				action: 'skipWaiting'
			});
		}
	}

	/**
	 * Update notification & Traking Service Worker
	 * @param {Object} worker 
	 */
	function trackingprogressInstalled(worker) {
		worker.addEventListener('statechange', () => {
			if (worker.state == 'installed') {
				updateReady(worker);
			}
		});
	}

	/**
	 * set style css for SW messaage
	 */
	function setStyleSw() {
		const css = `body.state-offline .offline-indicator, body.state-offline .offline-indicator--top {
			-webkit-transform: translateY(0);
			-moz-transform: translateY(0);
			-ms-transform: translateY(0);
			-o-transform: translateY(0);
			transform: translateY(0);
		}
		.offline-indicator {
			background-color: rgba(0, 0, 0, 0.8);
			color: #fff;
			padding: .9rem;
			position: fixed;
			z-index: 9999999999999999;
			left: 0;
			bottom: 0;
			width: 100%;
			-webkit-transform: translateY(100%);
			-moz-transform: translateY(100%);
			-ms-transform: translateY(100%);
			-o-transform: translateY(100%);
			transform: translateY(100%);
			will-change: transform;
			-webkit-transition: -webkit-transform 200ms ease-in-out;
			-webkit-transition-delay: 0s;
			-moz-transition: -moz-transform 200ms ease-in-out;
			-o-transition: -o-transform 200ms ease-in-out;
			transition: transform 200ms ease-in-out false;
		}
		.offline-indicator p {
			margin: 0 40px 0 0;
			color: #fff;
			text-align: center;
		}
		.offline-indicator .close-indicator {
			position: absolute;
			top: 0;
			right: 0;
			width: 45px;
			height: 100%;
			padding: 0;
			background: #000;
			border: none;
			font-size: 27px;
			font-weight: normal;
			border-radius: 0;
		}
		.offline-indicator .close-indicator:hover,
		.offline-indicator .close-indicator:focus {
			background: #575757;
		}
		.offline-indicator a {
			color: #FFF;
			font-weight: bold;
			text-decoration: underline;
		}`,
			head = document.head || document.getElementsByTagName('head')[0],
			style = document.createElement('style');

		style.type = 'text/css';
		if (style.styleSheet) {
			// This is required for IE8 and below.
			style.styleSheet.cssText = css;
		} else {
			style.appendChild(document.createTextNode(css));
		}

		head.appendChild(style);
	}

	/**
	 * set contianer html to show sw message for user
	 */
	function setSwMsgContianer() {
		const container = document.createElement('div');
		container.className = 'offline-indicator offline-indicator--bottom';

		const parag = document.createElement('p');
		parag.id = 'msgOffline';
		container.appendChild(parag);

		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'close-indicator';
		button.setAttribute('aria-label', 'close-indicator');
		button.addEventListener('click', hideMsg);

		const span = document.createElement('span');
		span.innerHTML = '&times;';

		button.appendChild(span);
		container.appendChild(button);

		// <button type="button" "class"="close" aria-label="Close">
		// 	<span>&times;</span>
		// </button>

		document.body.appendChild(container);

		updateNetworkState();

		window.addEventListener('online', updateNetworkState);
		window.addEventListener('offline', updateNetworkState);
	}

	/**
	 * update Network State : onLine | OffLine
	 */
	function updateNetworkState() {
		if (navigator.onLine) {
			hideMsg();
			_isOffline = false;
		} else {
			showMsg(_msgOffline);
			_isOffline = true;
		}
	}

	/**
	 * get All Css Js Img From Page for precache assets
	 */
	function getAllCssJsImgFromPage() {
		let arr = [];

		// Get all CSSStyleSheet
		for (CSSStyleSheet of document.styleSheets) {
			if (CSSStyleSheet.href !== null && CSSStyleSheet.href.match(/^(http|https):\/\//i))
				arr.push(CSSStyleSheet.href);
		}

		// Get all Images
		for (image of document.images) {
			if (image.src !== null && image.src.match(/^(http|https):\/\//i)) arr.push(image.src);
		}

		// Get all scripts
		for (script of document.scripts) {
			if (
				script.src !== null &&
				script.tagName === 'SCRIPT' &&
				script.src !== '' &&
				script.src.match(/^(http|https):\/\//i)
			)
				arr.push(script.src);
		}

		return arr;
	}

	/**
	 * handle Visibility Change for the page
	 */
	function handleVisibilityChange() {
		if (document.hidden) {
			// console.log('hidden');
			_isVisible = false;
		} else {
			// console.log('visible');
			_isVisible = true;
		}
	}
	document.addEventListener('visibilitychange', handleVisibilityChange, false);

	/**
	 * send message to sw
	 * @param {*} msg 
	 */
	function send_message_to_sw(msg) {
		return new Promise(function (resolve, reject) {
			// Create a Message Channel
			var msg_chan = new MessageChannel();

			// Handler for recieving message reply from service worker
			msg_chan.port1.onmessage = function (event) {
				if (event.data.error) {
					reject(event.data.error);
				} else {
					resolve(event.data);
				}
			};

			// Send message to service worker along with port for reply
			navigator.serviceWorker.controller.postMessage(msg, [msg_chan.port2]);
		});
	}

	function sendMsgChecksToSw() {
		window.addEventListener('load', function () {
			if (navigator.serviceWorker.controller) send_message_to_sw('checkUpdate');
			// if offline show msg to tell user that the data is saved for future online
			if (_isOffline) send_message_to_sw('checkMsgSyncLoad');
		});
	}

	/**
	 * Handler for messages coming from the service worker
	 */
	navigator.serviceWorker.addEventListener('message', function (event) {
		if (event.data === 'reloadThePageForMAJ') showMsg(_msgWhenUpdate);
		if (event.data === 'isVisible') event.ports[0].postMessage(_isVisible);
		if (event.data === 'isOffline') event.ports[0].postMessage(_isOffline);
		if (event.data.action === 'MsgSyncLoad') showMsg(` - ${event.data.value}`, true);

		// console.log('Client 1 Received Message: ' + event.data);
		// event.ports[0].postMessage("Client 1 Says 'Hello back!'");
	});

	// Helpers
	function showMsg(msg, addTo = false) {
		if (addTo) document.getElementById('msgOffline').innerHTML += msg;
		else document.getElementById('msgOffline').innerHTML = msg;
		document.body.classList.add('state-offline');
	}

	function hideMsg() {
		document.body.classList.remove('state-offline');
	}

	/****************** Fire Service Worker script ******************/

	if (!('serviceWorker' in navigator)) return;

	const config = {
		swUrl: 'http://localhost/b2w/wp-content/themes/bootstrap2wordpress/sw.php',
		msgOffline: "You're currently offline",
		msgWhenUpdate: `The contents of this page have been updated. Please <a href="javascript:location.reload()">reload</a>`,
		askUserWhenSwUpdated: true,
		msgWhenSwUpdated: 'New version available online. Do you want to update? ',
		preCache: 'onReload' // strategy for pre-caching assets : onReload | onAnalyzePage
	};
	initConfig(config);
	await serviceWorkerRegistration();
	setStyleSw();
	setSwMsgContianer();
	sendMsgChecksToSw();

	/*-------------------------------Notificationbtn-------------------------------*/
	let notifyBtn = null;
	class Notificationbtn {
		constructor(options) {
			if (notifyBtn) {
				return notifyBtn;
			}

			this.options = Object.assign({}, {
					btnPosition: "left", // left | right
					btnWidth: "md", // sm | lg | md
					popupDialogImg: "https://onesignal.com/bell/chrome-unblock.jpg",
					popupDialogTextAllowed: "Follow these instructions to block notifications",
					popupDialogTextBlocked: "Follow these instructions to allow notifications",
					popupDialogTitleAllowed: "Block Notifications",
					popupDialogTitleBlocked: "Unblock Notifications",
					shortMessageIfAllowed: "You've autorise notifications",
					shortMessageIfBlocked: "You've blocked notifications",
					stateColorAllowed: "#4CAF50",
					stateColorBlocked: "#e54b4d"
				},
				options
			)

			this.iconState = null;
			this.notifContainer = null;
			this.notifLauncher = null;
			this.message = null;
			this.dialog = null;
			this.pulseRing = null;
			this.messageText = null;
			this.notificationCircle = null;
			this.dialogHeadTitle = null;
			this.dialogBodyText = null;
			this.toggel = false;
			this.btnClicked = false;
			notifyBtn = this;
		}

		static init(options) {
			return new Notificationbtn(options);
		}

		static checkNotifSupport() {
			if (!('Notification' in window)) {
				console.info("Your browser doesn't support Notification");
				return false;
			}

			return true;
		}

		/**
		 * Create notification botton
		 * @param {*} options 
		 */
		static create(options = {}) {
			// console.log(options);
			if (!Notificationbtn.checkNotifSupport()) return;

			Notificationbtn.init(options);

			window.addEventListener('load', () => {
				notifyBtn.injectHtml();
				notifyBtn.setStyle();
				notifyBtn.setVariablesDom();
				notifyBtn.setPermissionBtn();
				notifyBtn.eventClickBtn();
				notifyBtn.eventMouseBtn();
				notifyBtn.listenToChangePermission();
			});
		}

		setVariablesDom() {
			notifyBtn.iconState = document.getElementById('notificationbtn-state');
			notifyBtn.notifContainer = document.getElementById('notificationbtn-bell-container');
			notifyBtn.notifLauncher = document.getElementById('notificationbtn-bell-launcher');
			notifyBtn.message = document.querySelector('.notificationbtn-bell-launcher-message');
			notifyBtn.dialog = document.querySelector('.notificationbtn-bell-launcher-dialog');
			notifyBtn.pulseRing = notifyBtn.notifLauncher.querySelector('.pulse-ring');
			notifyBtn.messageText = document.querySelector('.notificationbtn-bell-launcher-message-body');
			notifyBtn.notificationCircle = document.getElementById('notification-circle');
			notifyBtn.dialogHeadTitle = notifyBtn.dialog.querySelector('.dialoghead-title');
			notifyBtn.dialogBodyText = notifyBtn.dialog.querySelector('.dialogbody-text');
		}

		eventMouseBtn() {
			notifyBtn.notifLauncher.addEventListener('mouseover', function () {
				notifyBtn.message.classList.add('notificationbtn-bell-launcher-message-opened');
			});

			notifyBtn.notifLauncher.addEventListener('mouseout', function () {
				notifyBtn.message.classList.remove('notificationbtn-bell-launcher-message-opened');
			});
		}

		eventClickBtn() {
			notifyBtn.notifLauncher.addEventListener('click', function () {
				notifyBtn.triggerPermission()
				if (notifyBtn.toggel === false)
					notifyBtn.dialog.classList.add('notificationbtn-bell-launcher-dialog-opened');
				else notifyBtn.dialog.classList.remove('notificationbtn-bell-launcher-dialog-opened');

				notifyBtn.btnClicked = true;
				notifyBtn.toggel = !notifyBtn.toggel;

				notifyBtn.pulseRing.classList.remove('pulse-ring-animation');
				void notifyBtn.pulseRing.offsetWidth;
				notifyBtn.pulseRing.classList.add('pulse-ring-animation');
			});

			window.addEventListener('click', function (e) {
				if (notifyBtn.btnClicked === true) {
					notifyBtn.btnClicked = false;
					return;
				}

				if (notifyBtn.toggel === true) {
					notifyBtn.dialog.classList.remove('notificationbtn-bell-launcher-dialog-opened');
					notifyBtn.toggel = !notifyBtn.toggel;
				}

				return;
			});
		}

		listenToChangePermission() {
			if ('permissions' in navigator) {
				navigator.permissions.query({
					name: 'notifications'
				}).then(function (notificationPerm) {
					notificationPerm.onchange = function () {
						if (notificationPerm.state === 'granted') notifyBtn.permissionAllowedState();
						else notifyBtn.permissionBlockedState();
					};
				});
			}
		}

		permissionAllowedState() {
			notifyBtn.notificationCircle.style.fill = this.options.stateColorAllowed;
			notifyBtn.dialogHeadTitle.style.color = this.options.stateColorBlocked;
			notifyBtn.messageText.innerHTML = this.options.shortMessageIfAllowed;
			notifyBtn.dialogHeadTitle.innerHTML = this.options.popupDialogTitleAllowed;
			notifyBtn.dialogBodyText.innerHTML = this.options.popupDialogTextAllowed;
			notifyBtn.iconState.style.visibility = 'hidden';
		}

		permissionBlockedState() {
			notifyBtn.notificationCircle.style.fill = this.options.stateColorBlocked;
			notifyBtn.dialogHeadTitle.style.color = this.options.stateColorAllowed;
			notifyBtn.messageText.innerHTML = this.options.shortMessageIfBlocked;
			notifyBtn.dialogHeadTitle.innerHTML = this.options.popupDialogTitleBlocked;
			notifyBtn.dialogBodyText.innerHTML = this.options.popupDialogTextBlocked;
			notifyBtn.iconState.style.visibility = 'visible';
		}

		setPermissionBtn() {
			const Notification = window.Notification || window.mozNotification || window.webkitNotification;

			if (Notification.permission === 'granted') {
				notifyBtn.permissionAllowedState();
			} else if (Notification.permission === 'denied' || Notification.permission === 'default') {
				notifyBtn.permissionBlockedState();
				// Notification.requestPermission(function(permission) {
				// 	if (permission === 'granted') notifyBtn.permissionAllowedState();
				// });
			}
		}

		triggerPermission() {
			if (Notification.permission === 'denied' || Notification.permission === 'default')
				Notification.requestPermission()
		}

		injectHtml() {
			const html = `
            <div id="notificationbtn-bell-container" class="notificationbtn-bell-container notificationbtn-reset notificationbtn-bell-container-bottom-${this.options.btnPosition}">
                <div id="notificationbtn-bell-launcher" class="notificationbtn-bell-launcher notificationbtn-bell-launcher-${this.options.btnWidth} notificationbtn-bell-launcher-bottom-${this.options.btnPosition} notificationbtn-bell-launcher-theme-default notificationbtn-bell-launcher-active">
                    <div class="notificationbtn-bell-launcher-button">
                        <svg class="notificationbtn-bell-svg" xmlns="http://www.w3.org/2000/svg" width="99.7" height="99.7" viewBox="0 0 99.7 99.7" style="filter: drop-shadow(0 2px 4px rgba(34,36,38,0.35));; -webkit-filter: drop-shadow(0 2px 4px rgba(34,36,38,0.35));;">
                            <circle class="background" cx="49.9" cy="49.9" r="49.9" id="notification-circle"></circle>
                            <line class="stroke" id="notificationbtn-state" y2="80" x2="15" y1="15" x1="80" stroke-width="4" stroke="#fff" fill="none" />
                            <path class="foreground" d="M50.1 66.2H27.7s-2-.2-2-2.1c0-1.9 1.7-2 1.7-2s6.7-3.2 6.7-5.5S33 52.7 33 43.3s6-16.6 13.2-16.6c0 0 1-2.4 3.9-2.4 2.8 0 3.8 2.4 3.8 2.4 7.2 0 13.2 7.2 13.2 16.6s-1 11-1 13.3c0 2.3 6.7 5.5 6.7 5.5s1.7.1 1.7 2c0 1.8-2.1 2.1-2.1 2.1H50.1zm-7.2 2.3h14.5s-1 6.3-7.2 6.3-7.3-6.3-7.3-6.3z" ></path>
                            <ellipse class="stroke" cx="49.9" cy="49.9" rx="37.4" ry="36.9"></ellipse>
                        </svg>
                        <div class="pulse-ring"></div>
                    </div>
                    <div class="notificationbtn-bell-launcher-badge"></div>
                    <div class="notificationbtn-bell-launcher-message">
						<div class="notificationbtn-bell-launcher-message-body">
							${this.options.shortMessageIfBlocked}
						</div>
                    </div>
                    <div class="notificationbtn-bell-launcher-dialog">
                        <div class="notificationbtn-bell-launcher-dialog-body">
							<h1 class="dialoghead-title">
								${this.options.popupDialogTitleBlocked}
							</h1>
                            <div class="divider"></div>
                            <div class="instructions">
								<p class="dialogbody-text">
									${this.options.popupDialogTextBlocked}
								</p>
                                <a href="${this.options.popupDialogImg}" target="_blank" rel="noopener">
                                    <img src="${this.options.popupDialogImg}" alt="instructions">
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;

			const parser = new DOMParser();
			const doc = parser.parseFromString(html, 'text/html');
			document.body.append(doc.getElementById('notificationbtn-bell-container'));
		}

		setStyle() {
			const css = `.notificationbtn-reset,.notificationbtn-reset a,.notificationbtn-reset h1,.notificationbtn-reset p{background-attachment:scroll;background-color:transparent;background-image:none;background-position:0 0;background-repeat:repeat;border:medium currentColor;bottom:auto;clear:none;clip:auto;color:inherit;counter-increment:none;counter-reset:none;cursor:auto;direction:inherit;display:inline;float:none;font-family:inherit;font-size:inherit;font-style:inherit;font-variant:normal;font-weight:inherit;left:auto;letter-spacing:normal;line-height:inherit;list-style-type:inherit;list-style-position:outside;list-style-image:none;max-height:none;max-width:none;min-height:0;min-width:0;opacity:1;outline:medium invert;overflow:visible;position:static;right:auto;table-layout:auto;text-align:inherit;text-decoration:inherit;text-indent:0;text-transform:none;top:auto;unicode-bidi:normal;vertical-align:baseline;visibility:inherit;white-space:normal;word-spacing:normal;z-index:auto;background-origin:padding-box;background-clip:border-box;background-size:auto;-o-border-image:none;border-image:none;border-radius:0;box-shadow:none;box-sizing:content-box;column-count:auto;column-gap:normal;column-rule:medium none #000;column-span:1;column-width:auto;-webkit-font-feature-settings:normal;font-feature-settings:normal;overflow-x:visible;overflow-y:visible;-webkit-hyphens:manual;-ms-hyphens:manual;hyphens:manual;-ms-perspective:none;-o-perspective:none;perspective:none;-ms-perspective-origin:50% 50%;-o-perspective-origin:50% 50%;perspective-origin:50% 50%;-webkit-backface-visibility:visible;backface-visibility:visible;text-shadow:none;transition:all 0 ease 0;transform:none;transform-origin:50% 50%;transform-style:flat;word-break:normal;border-color:#000;margin:0;padding:0}.notificationbtn-reset,.notificationbtn-reset h1,.notificationbtn-reset p{display:block}.notificationbtn-reset p{margin:1em 0}#notificationbtn-bell-container.notificationbtn-reset{z-index:2147483000;position:fixed}#notificationbtn-bell-container.notificationbtn-reset.notificationbtn-bell-container-bottom-left{bottom:0;left:0}#notificationbtn-bell-container.notificationbtn-reset.notificationbtn-bell-container-bottom-right{bottom:0;right:0}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher{-webkit-touch-callout:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;-webkit-font-smoothing:initial;position:absolute;z-index:2147483000;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;transform:scale(.01) translateZ(0);opacity:0;transition:transform 175ms ease-in-out,opacity 175ms ease-in-out}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-left{bottom:20px;left:20px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-left.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-message{left:42px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-left.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-dialog{bottom:39px;left:0;transform-origin:left bottom}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-left.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-dialog:before{left:5px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-left.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-dialog:after{left:7px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-left.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-message{left:61px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-left.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-dialog{bottom:58px;left:0;transform-origin:left bottom}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-left.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-dialog:before{left:12px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-left.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-dialog:after{left:14px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-left.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-message{left:81px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-left.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-dialog{bottom:78px;left:0;transform-origin:left bottom}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-left.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-dialog:before{left:18px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-left.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-dialog:after{left:20px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-left .notificationbtn-bell-launcher-badge{left:4px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-left .notificationbtn-bell-launcher-message{transform-origin:left center}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-left .notificationbtn-bell-launcher-message:after{right:100%;border-right-color:#000}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-left .notificationbtn-bell-launcher-button{left:0}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-right{bottom:20px;right:20px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-right.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-message{right:42px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-right.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-dialog{bottom:39px;right:0;transform-origin:right bottom}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-right.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-dialog:before{right:5px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-right.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-dialog:after{right:7px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-right.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-message{right:61px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-right.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-dialog{bottom:58px;right:0;transform-origin:right bottom;filter:drop-shadow(0px2px2pxrgba(34,36,38,.15));-webkit-filter:drop-shadow(0px2px2pxrgba(34,36,38,.15))}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-right.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-dialog:before{right:12px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-right.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-dialog:after{right:14px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-right.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-message{right:81px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-right.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-dialog{bottom:78px;right:0;transform-origin:right bottom}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-right.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-dialog:before{right:18px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-right.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-dialog:after{right:20px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-right .notificationbtn-bell-launcher-badge{right:4px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-right .notificationbtn-bell-launcher-message{transform-origin:right center}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-right .notificationbtn-bell-launcher-message:after{left:100%;border-left-color:#000}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-right .notificationbtn-bell-launcher-button{right:0}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher .notificationbtn-bell-launcher-button{position:absolute;bottom:0;border-radius:50%;transition:transform 175ms ease-in-out,border 175ms ease-in-out,width 175ms ease-in-out,height 175ms ease-in-out;cursor:pointer;z-index:2147483000}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher .notificationbtn-bell-launcher-button svg{width:100%;height:100%;overflow:visible}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher .notificationbtn-bell-launcher-badge{position:absolute;bottom:0;border-radius:50%;text-align:center;top:0;cursor:pointer;-webkit-filter:drop-shadow(02px4pxrgba(34,36,38,0));filter:drop-shadow(02px4pxrgba(34,36,38,0));transition:transform 175ms ease-in-out,border 175ms ease-in-out,opacity .21s ease-in-out,width .21s ease-in-out,height .21s ease-in-out,position .21s ease-in-out,right .21s ease-in-out,top .21s ease-in-out,bottom .21s ease-in-out,left .21s ease-in-out;z-index:2147483400;opacity:0;transform:scale(.01);pointer-events:none}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher .notificationbtn-bell-launcher-badge.notificationbtn-bell-launcher-badge-opened{opacity:1;transform:scale(1)}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher .notificationbtn-bell-launcher-message{position:absolute;color:#fff;background:#000;cursor:pointer;border-radius:5px;transform:translateY(-50%) scaleX(0) translateZ(0);opacity:0;pointer-events:none;transition:transform 175ms ease-in-out,opacity 175ms ease-in-out;top:50%;z-index:2147481000}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher .notificationbtn-bell-launcher-message:after{top:50%;border:solid transparent;content:" ";height:0;width:0;position:absolute;pointer-events:none;border-color:transparent}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher .notificationbtn-bell-launcher-message .notificationbtn-bell-launcher-message-body{z-index:2147482000;max-width:100%;white-space:nowrap;text-overflow:ellipsis}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher .notificationbtn-bell-launcher-message.notificationbtn-bell-launcher-message-opened{pointer-events:auto;opacity:1;transform:translateY(-50%) scaleX(1) translateZ(0)}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher .notificationbtn-bell-launcher-dialog{cursor:pointer;position:absolute;background-color:#fff;border-radius:5px;border:1px solid rgba(0,0,0,.1);opacity:0;width:200px;transform:scale(0) translateZ(0);transition:transform 175ms ease-in-out,opacity 175ms ease-in-out;z-index:2147481000}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher .notificationbtn-bell-launcher-dialog ol{counter-reset:foo;display:table;border-spacing:.3em .75em}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher .notificationbtn-bell-launcher-dialog ol>li{counter-increment:foo;display:table-row;margin-bottom:.75em}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher .notificationbtn-bell-launcher-dialog ol>li:before{content:counter(foo) ".";display:table-cell;text-align:right}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher .notificationbtn-bell-launcher-dialog:after,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher .notificationbtn-bell-launcher-dialog:before{top:100%;border:solid transparent;content:" ";height:0;width:0;position:absolute}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body{z-index:2147482000;max-width:100%;white-space:nowrap;text-overflow:ellipsis;font-family:Helvetica Neue,Helvetica,Arial,sans-serif}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher .notificationbtn-bell-launcher-dialog.notificationbtn-bell-launcher-dialog-opened{transform:scale(1) translateZ(0);opacity:1}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher .notificationbtn-bell-launcher-dialog a{box-sizing:border-box;text-decoration:none;color:initial}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher .notificationbtn-bell-launcher-dialog a:active,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher .notificationbtn-bell-launcher-dialog a:focus,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher .notificationbtn-bell-launcher-dialog a:hover,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher .notificationbtn-bell-launcher-dialog a:hover:active,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher .notificationbtn-bell-launcher-dialog a:visited{text-decoration:none;color:initial}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher .notificationbtn-bell-launcher-dialog button{box-sizing:border-box;border:1px solid transparent;box-shadow:none;border-radius:4px;font-weight:400;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:.65px;cursor:pointer;padding:.625em 1em}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher .notificationbtn-bell-launcher-dialog button.action{color:#fff;background:#e54b4d;width:100%}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher .notificationbtn-bell-launcher-dialog button.action:hover{background:#dd2022}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher .notificationbtn-bell-launcher-dialog button.action:active{background:#b1191b}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-sm{height:32px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-button{width:32px;height:32px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-badge{font-size:8px;width:12px;height:12px;line-height:12px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-message{padding:9.6px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-message:after{margin-top:-6.6px;border-width:6.6px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-dialog:after{border-top-color:#fff;border-width:6.6px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-dialog:before{border-top-color:hsla(0,0%,71%,.1);border-width:8.6px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-md{height:48px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-button{width:48px;height:48px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-badge{font-size:12px;width:18px;height:18px;line-height:18px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-message{padding:14px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-message:after{margin-top:-9.9px;border-width:9.9px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-dialog:after{border-top-color:#fff;border-width:9.9px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-dialog:before{border-top-color:hsla(0,0%,71%,.1);border-width:11.9px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-lg{height:64px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-button{width:64px;height:64px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-badge{font-size:12px;width:24px;height:24px;line-height:24px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-message{padding:19.2px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-message:after{margin-top:-13.2px;border-width:13.2px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-dialog:after{border-top-color:#fff;border-width:13.2px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-dialog:before{border-top-color:hsla(0,0%,71%,.1);border-width:15.2px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-theme-default .notificationbtn-bell-launcher-button svg .stroke{fill:none;stroke:#fff;stroke-width:3px;stroke-miterlimit:10}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-theme-default .notificationbtn-bell-launcher-button.notificationbtn-bell-launcher-badge-active svg .background,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-theme-default .notificationbtn-bell-launcher-button.notificationbtn-bell-launcher-button-active svg .background{fill:#dd2022!important}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-theme-default .notificationbtn-bell-launcher-button .pulse-ring{border:7px solid hsla(0,0%,100%,.4)}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-theme-default .notificationbtn-bell-launcher-badge{border:1px solid #fff;background:#000;color:#fff}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-theme-inverse .notificationbtn-bell-launcher-button svg .stroke{fill:none;stroke:#e54b4d;stroke-width:3px;stroke-miterlimit:10}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-theme-inverse .notificationbtn-bell-launcher-button.notificationbtn-bell-launcher-badge-active svg .background,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-theme-inverse .notificationbtn-bell-launcher-button.notificationbtn-bell-launcher-button-active svg .background{fill:#f2f2f2!important}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-theme-inverse .notificationbtn-bell-launcher-button .pulse-ring{border:7px solid rgba(229,75,77,.4)}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-theme-inverse .notificationbtn-bell-launcher-badge{border:1px solid #fff;background:#e54b4d;color:#fff}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher-active,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher-enabled{transform:scale(1);opacity:1}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher-disabled{visibility:hidden}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher-inactive{opacity:.5}#notificationbtn-bell-container.notificationbtn-reset .pulse-ring{border-radius:50%;position:absolute;left:0;top:0;bottom:0;right:0;animation-iteration-count:1;opacity:0;z-index:1000;pointer-events:none}#notificationbtn-bell-container.notificationbtn-reset .pulse-ring-animation{animation:notifyButtonPulse .35s ease-in-out}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-left.notificationbtn-bell-launcher-sm,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-right.notificationbtn-bell-launcher-sm{transform-origin:center center;width:32px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-left.notificationbtn-bell-launcher-md,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-right.notificationbtn-bell-launcher-md{transform-origin:center center;width:48px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-left.notificationbtn-bell-launcher-lg,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-bottom-right.notificationbtn-bell-launcher-lg{transform-origin:center center;width:64px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher .notificationbtn-bell-launcher-button.notificationbtn-bell-launcher-button-hover,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher .notificationbtn-bell-launcher-badge.notificationbtn-bell-launcher-badge-hover{cursor:pointer}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-message .notificationbtn-bell-launcher-message-body,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-message .notificationbtn-bell-launcher-message-body,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-message .notificationbtn-bell-launcher-message-body{font-size:14px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-dialog,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-dialog,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-dialog{color:#333;padding:.3em .8em .6em}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body{font-size:14px;font-family:Helvetica Neue,Helvetica,Arial,sans-serif}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body h1,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body h1,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body h1{font-size:15px;line-height:1.2em;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;letter-spacing:.2px;text-align:center;color:#4CAF50;font-weight:700}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body p,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body p,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body p{font-size:14px;font-weight:400;font-family:Helvetica Neue,Helvetica,Arial,sans-serif}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .divider,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .divider,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .divider{border-bottom:1px solid rgba(0,0,0,.1);margin:.25em -.93em}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .kickback,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .kickback,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .kickback{text-align:center;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-weight:300;font-size:9.8px;letter-spacing:.5px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .instructions,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .instructions,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .instructions{max-width:95vw;max-height:70vh;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;font-weight:400;font-size:14px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .instructions img,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .instructions img,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .instructions img{width:100%}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .push-notification,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .push-notification,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .push-notification{display:flex;max-width:330px;border:1px solid rgba(0,0,0,.1);border-radius:3px;background:hsla(0,0%,98%,.5);overflow:auto;margin:.5em 0}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .push-notification .push-notification-icon,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .push-notification .push-notification-icon,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .push-notification .push-notification-icon{width:50px;height:50px;border-radius:2px;margin:6px 3px 6px 6px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .push-notification .push-notification-icon.push-notification-icon-default,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .push-notification .push-notification-icon.push-notification-icon-default,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .push-notification .push-notification-icon.push-notification-icon-default{background:#e3e4e5}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .push-notification .push-notification-icon img,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .push-notification .push-notification-icon img,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .push-notification .push-notification-icon img{width:50px;height:50px;border-radius:1px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .push-notification .push-notification-text-container,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .push-notification .push-notification-text-container,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .push-notification .push-notification-text-container{-ms-flex:1;flex:1;margin:6px 6px 6px 3px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .push-notification .push-notification-text-container .push-notification-text,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .push-notification .push-notification-text-container .push-notification-text,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .push-notification .push-notification-text-container .push-notification-text{height:5px;width:100%;background:#e3e4e5;border-radius:1px;margin:5px 0}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .push-notification .push-notification-text-container .push-notification-text.push-notification-text-short,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .push-notification .push-notification-text-container .push-notification-text.push-notification-text-short,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .push-notification .push-notification-text-container .push-notification-text.push-notification-text-short{width:75%}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .push-notification .push-notification-text-container .push-notification-text.push-notification-text-medium,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .push-notification .push-notification-text-container .push-notification-text.push-notification-text-medium,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .push-notification .push-notification-text-container .push-notification-text.push-notification-text-medium{width:87%}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .push-notification .push-notification-text-container .push-notification-text:first-of-type,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .push-notification .push-notification-text-container .push-notification-text:first-of-type,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .push-notification .push-notification-text-container .push-notification-text:first-of-type{margin-top:2px}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-sm .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .push-notification .push-notification-text-container .push-notification-text:last-of-type,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-md .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .push-notification .push-notification-text-container .push-notification-text:last-of-type,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-lg .notificationbtn-bell-launcher-dialog .notificationbtn-bell-launcher-dialog-body .push-notification .push-notification-text-container .push-notification-text:last-of-type{margin-bottom:0}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-theme-default .notificationbtn-bell-launcher-button svg .background,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-theme-inverse .notificationbtn-bell-launcher-button svg .foreground{fill:#e54b4d}#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-theme-default .notificationbtn-bell-launcher-button svg .foreground,#notificationbtn-bell-container.notificationbtn-reset .notificationbtn-bell-launcher.notificationbtn-bell-launcher-theme-inverse .notificationbtn-bell-launcher-button svg .background{fill:#fff}@media print{#notificationbtn-bell-container{display:none}}@keyframes notifyButtonPulse{0%{transform:scale(.1);opacity:0;border-width:10px}50%{opacity:1;border-width:5px}to{transform:scale(1.2);opacity:0;border-width:1px}}`,
				head = document.head || document.getElementsByTagName('head')[0],
				style = document.createElement('style');

			style.type = 'text/css';
			if (style.styleSheet) {
				// This is required for IE8 and below.
				style.styleSheet.cssText = css;
			} else {
				style.appendChild(document.createTextNode(css));
			}

			head.appendChild(style);
		}
	}

	// Optional options and these are the defaults
	const options = {
		btnPosition: "left", // left | right
		btnWidth: "md", // sm | md | lg
		popupDialogImg: "https://onesignal.com/bell/chrome-unblock.jpg",
		popupDialogTextAllowed: "Follow these instructions to block notifications",
		popupDialogTextBlocked: "Follow these instructions to allow notifications",
		popupDialogTitleAllowed: "Block Notifications",
		popupDialogTitleBlocked: "Unblock Notifications",
		shortMessageIfAllowed: "You've autorise notifications",
		shortMessageIfBlocked: "You've blocked notifications",
		stateColorAllowed: "#4CAF50",
		stateColorBlocked: "#e54b4d"
	}

	Notificationbtn.create(options)

})();
