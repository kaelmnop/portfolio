
const Simulations = {
    localStorageError() {
      return false 
    },
  

    deadEndError() {
      return Simulations.localStorageError() && true
    },
  
    // Maybe false, maybe a view
    workingOnView() {
      return false && Views.something()
    }
  }
  

  const Constants = {
    DELETE: 'delete a progress',
    SOMETHING: 'a thing',
    LOCALSTORAGE_ERROR:
      ``,
    DEAD_END_ERROR:
      `Not a lucky day. Please refresh the page and try again.`
  }
  

  const Utils = {
    sleep: async (durationMilliseconds) => {
      return new Promise(resolve => {
        return setTimeout(resolve, durationMilliseconds)
      })
    },
  
    branchOff: (srcFlow, subFlows) => async () => {
      const { key } = await srcFlow()
      return subFlows[key]()
    },
  
    toCSSText: (style) => {
      return Object.keys(style).reduce((acc, key) => {
        return `;
          ${acc};
          ${key}: ${style[key]};
        `
      }, ``)
    },
  
    pushStyle: (selector, styles) => {
      const el = document.querySelector(selector)
      const computedStyle = window.getComputedStyle(el)
      const originalStyle = Object.keys(styles).reduce((acc, key) => {
        return {
          ...acc,
          [key]: computedStyle[key]
        }
      }, {})
      const originalCSSText = Utils.toCSSText(originalStyle)
      el.style.cssText += Utils.toCSSText(styles)
      return originalCSSText
    }
  }
  

  const Actions = {
    async loadUserProgress() {
      await Utils.sleep(2000)
  
      if (Simulations.localStorageError()) {
        return Promise.resolve(Constants.LOCALSTORAGE_ERROR)
      }
  
      try {
        return window.localStorage.getItem('userProgress')
      } catch (e) {
        return Promise.resolve(Constants.LOCALSTORAGE_ERROR)
      }
    },
  
    async saveUserProgress() {
      await Utils.sleep(2000)
      try {
        return window.localStorage.setItem(
          'userProgress',
          JSON.stringify({some: 'data'})
        )
      } catch (e) {
        return Promise.resolve(Constants.LOCALSTORAGE_ERROR)
      }
    },
  
    async deleteUserProgress() {
      await Utils.sleep(2000)
      try {
        window.localStorage.removeItem('userProgress')
      } catch (e) {
        return Promise.resolve(Constants.LOCALSTORAGE_ERROR)
      }
      return Promise.resolve()
    },
  
    reloadPage() {
      try {
        if (Simulations.deadEndError()) {
          return Promise.resolve(Constants.DEAD_END_ERROR)
        }
        window.location.href = window.location.href
      } catch (e) {
        return Promise.resolve(Constants.DEAD_END_ERROR)
      }
    }
  }
  

  const Flows = {
    master: async () => {
      if (Simulations.workingOnView()) {
        return Simulations.workingOnView()
      }
  
      const [ , progress ] = await Promise.all([
        Views.loading(),
        Actions.loadUserProgress()
      ])
      if (!progress) {
        return Flows.firstTime()
      }
      if (progress === Constants.LOCALSTORAGE_ERROR) {
        return Flows.abort(progress)
      }
      return Flows.continuation()
    },
  
    firstTime: async () => {
      if (Simulations.workingOnView()) {
        return Simulations.workingOnView()
      }
  
      await Views.intro1()
      await Views.intro2()
      await Views.intro3()
      await Views.intro4()
      await Views.intro5()
      return Flows.continuation()
    },
  

    continuation: Utils.branchOff(
      () => Views.main(),
      {
        async [Constants.SOMETHING]() {
          await Views.something()
          return Flows.continuation()
        },
  
        async [Constants.DELETE]() {
          await Promise.all([
            Views.deleting(),
            Actions.deleteUserProgress()
          ])
          return Flows.master()
        }
      }
    ),
  
    abort: async (progress) => {
      await Views.error(progress)
      const reloadError = await Actions.reloadPage()
      if (reloadError === Constants.DEAD_END_ERROR) {
        return Flows.deadEnd(reloadError)
      }
    },
  
    deadEnd: async (reason) => {
      await Views.deadEnd(reason)
    }
  }
  

  const Layouts = {
    init(el) {
      this.el = el
    },
  
    async message({ content, enter, transitionDuration = 500 }) {
      const template = () => {
        return `
          <div class="layout message-layout">
            ${content}
          </form>
        `
      }
  
      const cssVariables = () => `;
        --transition-duration: ${transitionDuration};
      `
  
      if (typeof enter === 'function') {
        enter()
      }
      this.el.innerHTML = template()
      this.el.style.cssText += cssVariables()
      return new Promise()
    },
  
    async messageWithButtons({ content, btn, enter, exit, transitionDuration = 500 }) {
      const getBtn = (maybeMultipleBtns) => {
        if (Array.isArray(maybeMultipleBtns)) {
          return maybeMultipleBtns
        }
        return [maybeMultipleBtns]
      }
  
      const template = () => {
        return `
          <form id="complete-step-form" class="layout message-layout">
            ${content}
            <footer>
              ${getBtn(btn).map(eachBtn => `
                <button
                  class="btn ${eachBtn.type || ''}"
                  data-key="${eachBtn.key || Constants.FORWARD}"
                >
                  ${eachBtn.text}
                </button>
              `).join('')}
            </footer>
          </form>
        `
      }
  
      const cssVariables = () => `;
        --transition-duration: ${transitionDuration};
      `
  
      const listenToFormSubmit = (onSubmit) => {
        const form = this.el.querySelector('#complete-step-form')
        form.addEventListener('submit', async e => {
          e.preventDefault()
          form.classList.add('exiting')
          if (typeof exit === 'function') {
            await exit(restoredValues)
          }
          setTimeout(() => {
            onSubmit({
              key: e.submitter.dataset.key
            })
          }, transitionDuration)
        })
      }
  
      let restoredValues
      if (typeof enter === 'function') {
        restoredValues = enter()
      }
      this.el.innerHTML = template()
      this.el.style.cssText += cssVariables()
      return new Promise(listenToFormSubmit)
    },
  
    async statusFeedback({ text, type, animationDuration = 1500 }) {
      const template = () => {
        const typeClassName = type || ''
        return `
          <div class="layout status-feedback-layout">
            <span class="animation-object ${type}"></span>
            <span class="status-text ${type}">${text}</span>
          </div>
        `
      }
  
      const cssVariables = () => `;
        --animation-duration: ${animationDuration}ms;
        --type: ${type};
      `
  
      const listenToAnimationEnd = (onEnd) => {
        setTimeout(onEnd, animationDuration)
      }   
  
      this.el.innerHTML = template()
      this.el.style.cssText += cssVariables()
      await new Promise(listenToAnimationEnd)
    },
  }
  
  // Things to render on the screen
  const Views = {
    async loading() {
      return Layouts.statusFeedback({
        text: '',
        type: 'loading'
      })
    },
  
    async saving() {
      return Layouts.statusFeedback({
        text: '',
        type: 'saving'
      })
    },
  
    async deleting() {
      return Layouts.statusFeedback({
        text: '',
        type: 'deleting'
      })
    },
  
    async intro1() {
      return Layouts.messageWithButtons({
        content: `
          <h1>Bonjour,</h1>
            <p>Bienvenue sur mon site.</p>
        `,
        btn: {
          text: "Le site de qui ?"
        }
      })
    },
  
    async intro2() {
      return Layouts.messageWithButtons({
        content: `
          <h1>Je m'appelle Kael</h1>
          <p>Ancien sysadmin dans la cybers??curit?? de 32 ans, je suis en reconversion vers le d??veloppement web.</p>
        `,
        btn: {
          text: 'Pourquoi ?'
        }
      })
    },
  
    async intro3() {
      return Layouts.messageWithButtons({
        content: `
          <h1>Parce que.</h1>
          <p>Et plus s??rieusement : comme beaucoup, j'ai commenc?? l'informatique en d??couvrant HTML & CSS ; et ??a m'a toujours plu !</p>
          <p>Aujourd'hui, apr??s une p??riode de r??flexion, j'ai d??cid?? de revenir aux sources.</p>
        `,
        btn: {
          text: 'Et comment ?'
        }
      })
    },
  
    async intro4() {
      return Layouts.messageWithButtons({
        content: `
          <h1>L'alternance</h1>
          <p>Pour cela, j'ai pass?? les concours pour acc??der ?? diff??rentes formations - il ne me manque que l'alternance !</p>
          <p>C'est donc pour ??a que vous ??tes l??.</p>
          <p>J'ai deux solutions ?? vous proposer.</p>
        `,
        btn: {
          text: "Lesquelles ?"
        }
      })
    },
    async intro5() {
      return Layouts.messageWithButtons({
        content: `
          <h1>OpenClassrooms et WebForce3</h1>
          <p>Chacune avec des avantages pour vous comme pour moi.</p>
          <p> OpenClassrooms se base sur des projets mentor??s tout au long de la formation, WebForce3 pr??pare ses ??tudiants via un bootcamp de 3mois.</p>
          <p>Pour les d??tails, c'est <a className="app-a" href="#about">par ici</a>.</p>
        `,
        btn: {
          text: "Et alors ?"
        }
      })
    },
  
    async main() {
      return Layouts.messageWithButtons({
        content: `
          <h1>Alors...</h1>
          <p>Si vous ??tes int??ress??, ou que vous voulez en discuter pour <a className="app-a" href="#about">en savoir plus</a>, n'h??sitez pas ?? <a className="app-a" href="#contact">me contacter</a>, je serais ravi d'??changer avec vous !</p>
        `,
        btn: {
          text: 'On recommence ?',
          key: Constants.DELETE
        }
      })
    },
  
  
    async error(message) {
      return Layouts.messageWithButtons({
        enter() {
          return Utils.pushStyle('body', {
            background: 'linear-gradient(to bottom, violet, lightblue)',
            color: 'black',
            transition: 'all 0.5s'
          })
        },
        async exit(originalCSSText) {
          document.body.style.cssText += originalCSSText
          await Utils.sleep(500)
          return Promise.resolve()
        },
        content: `
          <h1>Error</h1>
          <p>${message}</p>
        `,
        btn: {
          text: 'Refresh page',
          type: 'absurd'
        }
      })
    },
  
    async deadEnd(reason) {
      return Layouts.message({
        enter() {
          return Utils.pushStyle('body', {
            background: `
              linear-gradient(135deg, white -60%, transparent 30%),
              linear-gradient(135deg, #fd3 50%, black 300%)
            `,
            color: 'black',
            transition: 'all 0.5s'
          })
        },
        content: `
          <h1>Dead end.</h1>
          <p>${reason}</p>
        `
      })
    }
  }
  
  // Layouts should recognize the container
  Layouts.init(document.getElementById('app'))
  
  // Init one of the flows
  Flows.master()
