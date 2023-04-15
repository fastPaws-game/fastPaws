import {
  CANVAS,
  GAME,
  TARGET_SCORE,
  TargetName,
  VICTIM_LIST,
  BARRIER_LIST,
  DIFFICULTY_PER_LEVEL,
  TOOLTIP,
} from '../constants/game'
import Draw from './Draw'
import Resource, { GifObject } from '../engine/ResourceLoader'
import BgMotion from '../engine/BgMotion'

type Action = 'run' | 'stay' | 'jump' | 'path' | 'scene' | 'return' | null
type Target = {
  nameCurr: TargetName
  nameLast: TargetName
  xCurr: number
  yCurr: number
  PositionX: number
  xLast: number
  yLast: number
  heightCurr: number
  heightLast: number
  isBarrier: boolean
  runAwayDelay: number
}
type TGame = {
  SPEED: number
  successHeightModifer: number
  updateTime: number
  action: Action
  ctx: CanvasRenderingContext2D | null
  hold: boolean
  timer: number
  movementSpeed: number
  runAwaySpeed: number
  successHeight: number
  success: boolean
  fullJump: boolean
  score: number
  paused: boolean
  tooltip: {
		shown: boolean
		firstTip: boolean
    firstVictim: boolean
    firstBarrier: boolean
    firstTimeout: boolean
  }
}
type TCat = {
  source: GifObject
  jumpHeight: number
  jumpStage: number
  trajectoryDirection: number
  CatX: number
  CatY: number
  atPosition: boolean
}

export default class Engine {
  private game: TGame = {
    SPEED: 0.5, // Game complexity refers to current level (Slow: 0.5 Max: 1)
    successHeightModifer: 1.2, // Defines jump to target height ratio
    // Frame rait, actually no :). Updates automatically.
    get updateTime(): number {
      return Math.floor(17 / this.SPEED)
    },
    action: null,
    ctx: null,
    hold: false, // State to prevent jump attemptt in some actions
    timer: 0, // setTimeout link
    movementSpeed: 6,
    runAwaySpeed: 6,
    successHeight: GAME.defaultTargetHeight,
    success: false,
    fullJump: true, // To know does current target need a full jump
    score: 0,
    paused: false,
    tooltip: {
			shown: false,
      firstTip: true,
      firstVictim: true,
      firstBarrier: true,
      firstTimeout: true,
    },
  }
  private cat: TCat = {
    source: {} as GifObject,
    jumpHeight: GAME.jumpHeightMin,
    jumpStage: 0,
    trajectoryDirection: 1,
    CatX: GAME.defaultCatX,
    CatY: GAME.defaultCatY,
    atPosition: false,
  }
  private target: Target = {
    nameCurr: 'none',
    nameLast: 'none',
    xCurr: this.cat.CatX + CANVAS.width / 2,
    yCurr: GAME.defaultTargetY,
    xLast: GAME.defaultTargetX,
    yLast: GAME.defaultTargetY,
    PositionX: GAME.defaultTargetX, // A place where a target will stop
    heightCurr: GAME.defaultTargetHeight,
    heightLast: GAME.defaultTargetHeight,
    isBarrier: false,
    runAwayDelay: GAME.defaultRunAwayDelay,
  }
  private resource: Resource
  private draw: Draw
  private bgMotion: BgMotion
  private handlePause: () => void
  private handleGameOver: () => void
  private showScore: (score: number) => void
  private showLevel: (score: number) => void
  private setTooltip: (tooltip: string) => void
  private static __instance: Engine

  private constructor(handlers: Record<string, (value?: any) => void>) {
    this.handlePause = handlers.handlePause
    this.handleGameOver = handlers.handleGameOver
    this.showLevel = handlers.setLevel
    this.showScore = handlers.setScore
    this.setTooltip = handlers.setTooltip

    const canvas = document.getElementById('game_canvas') as HTMLCanvasElement
    this.game.ctx = canvas.getContext('2d')
    this.game.successHeight = GAME.defaultTargetHeight * this.game.successHeightModifer
    this.draw = new Draw(this.game.ctx!)
    this.bgMotion = new BgMotion()

    this.resource = Resource.get()
    this.cat.source = this.resource.sprite.cat as GifObject
    this.game.score = GAME.initialScore // Get score from store
  }

  private showTooltip(text?: string) {
    if (!text && this.game.tooltip.shown) {
      this.setTooltip('')
      this.game.tooltip.shown = false
      this.game.tooltip.firstTip = false
      return
    }
    if (typeof text == 'string') {
      this.setTooltip(text)
      this.game.tooltip.shown = true
    }
  }

	private showFirstTooltip = (reason?: 'timeout') => {
		if (this.target.isBarrier) {
			if (this.game.tooltip.firstBarrier) {
				this.game.tooltip.firstBarrier = false
				this.showTooltip(TOOLTIP.firstBarrier)
			}
			return
		}

		if (reason === 'timeout') {
			if (this.game.tooltip.firstTimeout) {
				this.game.tooltip.firstTimeout = false
				this.showTooltip(TOOLTIP.firstTimeout)
			}
			return
		}
		
		if (this.game.tooltip.firstVictim) {
			this.game.tooltip.firstVictim = false
			this.showTooltip(TOOLTIP.firstVictim)
		}
	}

  private setScore = (value: number) => {
    this.game.score += value
    this.showScore(this.game.score)
    if (this.game.success) this.showTooltip() // Hide tooltip
    // console.log((value > 0 ? 'Success!' : 'Fail.') + ' Score:', this.game.score)
  }

  private commitFail = (reason?: 'timeout') => {
    if (this.game.score + TARGET_SCORE[this.target.nameCurr].fail < 0) {
      this.game.score = GAME.initialScore
      this.game.paused = true
      // console.log('Game over')
      this.handleGameOver()
      return
    }
		this.showFirstTooltip(reason)

    this.game.hold = true
    this.game.success = false
    this.game.action = 'return'
    this.setScore(TARGET_SCORE[this.target.nameCurr].fail)
    if (!this.target.isBarrier) this.levelPrepare()
  }

  private commitSuccess = () => {
    this.setScore(TARGET_SCORE[this.target.nameCurr].success)
    if (!this.target.isBarrier) this.target.nameCurr = 'none'
    this.levelPrepare()
  }

  private prepareJumpStart() {
    this.game.hold = true
    // Stop all current actions
    this.game.action = null
    // Wait till all actions will be stoped
    setTimeout(() => {
      // Start a new jump request
      this.game.action = 'path'
      this.cat.jumpHeight = GAME.jumpHeightMin
      this.cat.trajectoryDirection = 1
      requestAnimationFrame(this.update)
    }, this.game.updateTime)
  }

  private prepareJumpEnd() {
    this.game.hold = false
    this.game.action = 'stay'
    // Prevent accidentially tapping
    if (this.cat.jumpHeight > GAME.jumpHeightMin + GAME.trajectoryStep * 2) {
      this.game.action = 'jump'
      this.cat.jumpStage = -Math.PI
      this.game.success =
        (this.target.isBarrier && this.cat.jumpHeight > this.game.successHeight) ||
        Math.abs(this.cat.jumpHeight - this.game.successHeight) < 10
      // console.log('Jump height: ', this.jumpHeight, '/', this.successHeight, this.success)	// Do not remove!
    }
  }

  private defineTrajectory = () => {
    this.cat.jumpHeight += GAME.trajectoryStep * this.cat.trajectoryDirection
    if (this.cat.jumpHeight >= GAME.jumpHeightMax) this.cat.trajectoryDirection = -1
    if (this.cat.jumpHeight < GAME.jumpHeightMin) {
      // Stops jump request
      this.game.action = 'stay'
      this.cat.jumpStage = -Math.PI
      requestAnimationFrame(this.update)
    }
    this.draw.drawTrajectory(this.cat.CatX, this.cat.CatY, this.cat.jumpHeight)
  }

  private defineJump = () => {
    const r = this.cat.jumpHeight // Circle radius
    const points = r / 4 // Position count
    const step = Math.PI / points
    this.cat.jumpStage += step
    const i = this.cat.jumpStage
    if (!this.game.fullJump && !this.game.success && i > -Math.PI / 2) {
      this.commitFail()
    }
    if (i < 0) {
      this.cat.CatX = GAME.defaultCatX + r + r * Math.cos(i)
      const y = this.cat.CatY + r * Math.sin(i)
      const frameIndex = Math.floor(((i + Math.PI) / Math.PI) * 3)
      this.draw.drawCat(this.cat.source.frames[frameIndex].image, this.cat.CatX, y)
    } else {
      this.game.success ? this.commitSuccess() : this.commitFail()
    }
    /*	Trajectory algorithm
			for (let i = -Math.PI; i < 0; i += step) {
				const x = this.CatX + r + r * Math.cos(i);
				const y = this.CatY + r * Math.sin(i);
				this.ctx!.fillRect(x, y, 2, 2);
			}
*/
  }

  private sceneChange = () => {
    // Move last target
    if (this.target.nameLast != 'none') {
      this.runAway()

      this.draw.drawTarget(
        this.target.nameLast,
        this.target.xLast,
        this.target.yLast,
        this.target.heightLast,
        !this.game.success
      )
      if (this.target.xLast < 0 || this.target.xLast > CANVAS.width) this.target.nameLast = 'none'
    }

    // Move current target
    this.target.xCurr -= this.game.movementSpeed
    if (this.target.xCurr <= this.target.PositionX) {
      this.game.action = 'stay'
      this.game.hold = false
      if (!this.target.isBarrier) {
        this.game.timer = window.setTimeout(() => this.commitFail('timeout'), this.target.runAwayDelay)
      }
      this.bgMotion.stop()
    }

    // Move Cat
    if (this.cat.CatX > GAME.defaultCatX) {
      this.cat.CatX -= Math.floor((this.game.movementSpeed / 3) * 2)
    } else {
      if (!this.cat.atPosition) this.bgMotion.start(Math.floor((this.game.updateTime / 2) * 3))
      this.cat.atPosition = true
      if (this.target.nameLast != 'none') {
        // this.movementSpeed = 4
      }
    }
  }

  private runAway = () => {
    if (this.target.nameLast == 'butterfly' || this.target.nameLast == 'bird') {
      this.target.xLast -= this.game.runAwaySpeed
      this.target.yLast -= this.target.nameLast == 'butterfly' ? Math.random() * 6 : 4
      return
    }

    if (this.target.nameLast == 'grasshopper') {
      this.target.xLast -= this.game.runAwaySpeed
      return
    }

    if (this.target.nameLast == 'mouse') {
      this.target.xLast += this.game.runAwaySpeed
      return
    }

    this.target.xLast -= this.game.movementSpeed
    return
  }

  private sceneReturn = () => {
    // Move Cat
    if (this.cat.CatX > GAME.defaultCatX) {
      this.cat.CatX -= this.game.movementSpeed
    } else {
      this.game.action = 'stay'
      this.game.hold = false
    }
  }

  private movingCat = () => {
    this.draw.drawCat(this.cat.source.image, this.cat.CatX, this.cat.CatY)
    setTimeout(this.update, this.game.updateTime)
  }

  // Renders one frame
  private render = () => {
    // Development time patch
    if (!this.cat.source) this.cat.source = this.resource.sprite.cat as GifObject
    this.game.ctx!.clearRect(0, 0, CANVAS.width, CANVAS.height)
    this.draw.drawTarget(this.target.nameCurr, this.target.xCurr, this.target.yCurr, this.target.heightCurr)

    switch (this.game.action) {
      case 'return':
        this.sceneReturn()
        this.movingCat()
        break
      case 'scene':
        this.sceneChange()
        this.movingCat()
        break
      case 'run':
        this.movingCat()
        break
      case 'path':
        this.defineTrajectory()
        this.draw.drawCat(this.cat.source.frames[0].image, this.cat.CatX, this.cat.CatY)
        setTimeout(this.update, this.game.updateTime)
        break
      case 'jump':
        this.defineJump()
        setTimeout(this.update, this.game.updateTime)
        break
      default: //'stay'
        this.draw.drawCat(this.cat.source.frames[2].image, this.cat.CatX, this.cat.CatY)
    }
  }

  // Main update function
  private update = (timer: number) => {
    if (!this.game.paused && this.game.ctx) {
      // Develpement time patch
      if (this.resource.sprite.cat && !this.resource.sprite.cat.loading) {
        this.render()
      } else {
        console.log('Waiting for GIF image')
        setTimeout(this.update, 500)
      }
    }
  }

  private levelPrepare = () => {
    // Developement time patch (React.StrictMode)
    if (this.game.action == 'scene') return
    window.clearTimeout(this.game.timer)
    const level = Math.min(Math.floor(Math.max(this.game.score, 0) / GAME.scorePerLevel), 5)
    this.showLevel(level)
    this.showScore(this.game.score)
    if (this.game.tooltip.firstTip) this.showTooltip(TOOLTIP.newGame)
    this.game.SPEED = 0.5 + level * 0.1
    const targets = DIFFICULTY_PER_LEVEL[level]
    const rand = Math.floor(Math.random() * targets.length)
    this.target.nameLast = this.target.nameCurr
    this.target.heightLast = this.target.heightCurr
    this.target.xLast = this.target.xCurr
    this.target.yLast = this.target.yCurr
    this.target.xCurr = Math.max(this.cat.CatX + CANVAS.width / 2, CANVAS.width)
    this.target.yCurr = GAME.defaultTargetY
    this.target.nameCurr = targets[rand]
    this.target.isBarrier = BARRIER_LIST.includes(this.target.nameCurr)
    this.target.PositionX = this.target.isBarrier
      ? GAME.defaultTargetX
      : GAME.defaultTargetX + Math.floor(Math.random() * GAME.victimPositionDelta)
    this.target.heightCurr = this.target.isBarrier
      ? GAME.defaultTargetHeight + GAME.stepTargetHeight * level
      : GAME.defaultTargetHeight
    this.target.runAwayDelay = GAME.defaultRunAwayDelay - GAME.stepTargetDelay * level
    this.game.action = 'scene'
    this.game.hold = true
    this.game.paused = false
    this.game.movementSpeed = 6
    this.game.successHeight = this.target.isBarrier
      ? Math.floor(this.target.heightCurr * this.game.successHeightModifer)
      : (this.target.PositionX - GAME.defaultCatX) / 2
    this.game.fullJump = this.target.nameCurr == 'puddle' || VICTIM_LIST.includes(this.target.nameCurr)
    this.cat.atPosition = false
    // console.log(`Level ${level}:`, {speed: this.game.SPEED, rand: `${rand}/${targets.length}`, target: this.target})
    this.bgMotion.start(this.game.updateTime)
    requestAnimationFrame(this.update)
  }

  private onkeydown = (event: KeyboardEvent) => {
    if (!this.game.hold && event.code == 'Space') {
      this.prepareJumpStart()
    }
  }

  private onkeyup = (event: KeyboardEvent) => {
    if (this.game.hold && event.code == 'Space') {
      this.prepareJumpEnd()
    }
    if (event.code == 'Escape') {
      this.pause(true)
    }
  }

  private touchstart = (event: MouseEvent | TouchEvent) => {
    event.preventDefault()
    if (!this.game.hold) {
      this.prepareJumpStart()
    }
  }

  private touchend = () => {
    this.prepareJumpEnd()
  }

  private registerEvents = () => {
    window.addEventListener('keydown', this.onkeydown)
    window.addEventListener('keyup', this.onkeyup)
    window.addEventListener('touchstart', this.touchstart)
    window.addEventListener('touchend', this.touchend)
    window.addEventListener('mousedown', this.touchstart)
    window.addEventListener('mouseup', this.touchend)
  }

  private unRegister = () => {
    window.removeEventListener('keydown', this.onkeydown)
    window.removeEventListener('keyup', this.onkeyup)
    window.removeEventListener('touchstart', this.touchstart)
    window.removeEventListener('touchend', this.touchend)
    window.removeEventListener('mousedown', this.touchstart)
    window.removeEventListener('mouseup', this.touchend)
  }

  public start() {
    this.registerEvents()
    this.levelPrepare()
  }

  public stop() {
    this.unRegister()
  }

  public pause = (state: boolean) => {
    if (this.game.paused == state) return
    this.game.paused = state
    console.log(`Game: ${this.game.paused ? 'Pause' : 'Continue'}`)
    if (this.game.paused) {
      this.unRegister()
      this.bgMotion.stop()
      this.handlePause()
      window.clearTimeout(this.game.timer)
    } else {
      this.registerEvents()
      requestAnimationFrame(this.update)
    }
  }

  public static get(handlers?: Record<string, () => void>) {
    if (Engine.__instance) return Engine.__instance
    if (handlers) Engine.__instance = new Engine(handlers)
    return Engine.__instance
  }
}
