import { AnimationGroup, ArcRotateCamera, Mesh, Quaternion, Ray, RuntimeAnimation, Scene, ShadowGenerator, TransformNode, UniversalCamera, Vector2, Vector3 } from "@babylonjs/core";

export class Player {//extends TransformNode {
    // General settings
    //public static SPEED: number = 0.25;
    public static FIRST_JUMP_FORCE: number = 0.10;
    public static SECOND_JUMP_FORCE: number = 0.08;
    public static GRAVITY: number = -0.0032;
    public static DASH_FACTOR: number = 1.5;
    public static AIR_RESISTANCE: number = 0.15;
    public static ACCELERATION: number = 0.010;
    public static FALL_MAX_SPEED: number = 0.1;
    public static WIDTH = 0.25;
    public static HEIGHT = 0.8;
    // Input settings
    private _jumpCooldown: number = 60;
    private _jumpCount: number = 2;
    private _jumpFrameSinceLastPressed : number = 0;
    private _secondJumpUsed : boolean = false;
    private _pressIsFirstJump : boolean = false;

    // Camera
    private _camRoot: TransformNode;
    public camera: ArcRotateCamera;
    static ORIGINAL_TILT: Vector3 = new Vector3(Math.PI/8,0,0);

    // Scene
    public scene: Scene;

    // Animations
    private _walk: AnimationGroup;
    private _run: AnimationGroup;
    private _runStart: AnimationGroup;
    private _idle: AnimationGroup;
    private _jump: AnimationGroup;
    private _land: AnimationGroup;
    private _dash: AnimationGroup;
    private _currentAnim: AnimationGroup;
    private _prevAnim: AnimationGroup;

    // Animations settings
    private _runStartCountFrame : number = 0; 
    private _runStarttoRunNbFrame: number = 130;
    
    // State
    private _grounded;

    // Controls/Physics
    private _input;
    private _h: number;
    private _v: number;
    private _acc: Vector3 = new Vector3(0, 0, 0);
    private _speed: Vector3 = new Vector3(0, 0, 0);
    private _inputAmt;
    private _gravity: Vector3 = new Vector3();
    private _lastGroundPos: Vector3 = Vector3.Zero();
    private _deltaTime;
    private _canDash : boolean;
    private _dashPressed : boolean;

    // Player
    public mesh: Mesh;

    constructor(assets, scene: Scene, shadowGenerator: ShadowGenerator, input) {
        this.scene = scene;
        this.mesh = assets.mesh;
        this._setupPlayerCamera();
        shadowGenerator.addShadowCaster(assets.mesh); //the player mesh will cast shadows
        this._input = input;
        /*
        this._idle = assets.animationGroups[0];
        this._walk = assets.animationGroups[2];
        this._runStart = assets.animationGroups[4];
        this._run = assets.animationGroups[6];
        this._setUpAnimations();
        */
        //console.log(assets.animationGroups);
    }

    private _setupPlayerCamera() : ArcRotateCamera {
        //root camera parent that handles positioning of the camera to follow the player
        this._camRoot = new TransformNode("root");
        this._camRoot.position = this.mesh.position;
        //to face the player from behind (180 degrees)
        this._camRoot.rotation = new Vector3(0, Math.PI, 0);

        //our actual camera that's pointing at our root's position
        this.camera = new ArcRotateCamera("playerCamera", Math.PI/10, Math.PI/10, 10, new Vector3(0, 0, 0), this.scene)
        this.camera.lockedTarget = this._camRoot.position;
        //this.camera.fov = 0.47350045992678597;
        this.camera.parent = this._camRoot;
        this.camera.wheelPrecision = Infinity;
        this.camera.radius = 8;
        this.camera.attachControl(true);

        this.scene.activeCamera = this.camera;
        return this.camera;
    }

    private _updateCamera(): void {
        let centerPlayer = this.mesh.position.y + 0.8;
        this._camRoot.position = Vector3.Lerp(this._camRoot.position, new Vector3(this.mesh.position.x, centerPlayer, this.mesh.position.z), 0.4);
    }

    private _updateMovementFromInput(): void {
        this._deltaTime = this.scene.getEngine().getDeltaTime() / 1000.0;
        // -- X and Z part --
        let xzInputAsVector = Vector3.Zero(); // vector that holds movement information
        this._h = this._input.horizontal; //x-axis
        this._v = this._input.vertical; //z-axis
        
        //--MOVEMENTS BASED ON CAMERA (as it rotates)--
        let fwd = new Vector3(Math.cos(this.camera.alpha), 0, Math.sin(this.camera.alpha));
        let right = new Vector3(Math.sin(this.camera.alpha), 0, -Math.cos(this.camera.alpha));
        
        let correctedVertical = fwd.scaleInPlace(this._v);
        let correctedHorizontal = right.scaleInPlace(this._h);
        //movement based off of camera's view
        let move = correctedHorizontal.addInPlace(correctedVertical);

        //clamp the input value so that diagonal movement isn't twice as fast
        let inputMag = Math.abs(this._h) + Math.abs(this._v);
        if (inputMag < 0) {
            this._inputAmt = 0;
        } else if (inputMag > 1) {
            this._inputAmt = 1;
        } else {
            this._inputAmt = inputMag;
        }

        //final movement that takes into consideration the inputs
        xzInputAsVector = move.scaleInPlace(this._inputAmt);
        this._acc = new Vector3(xzInputAsVector.x * Player.ACCELERATION, Player.GRAVITY, xzInputAsVector.z * Player.ACCELERATION);
        this._speed = (this._speed.addInPlace(this._acc));
        
        // -- Y part --
        if (this._jumpFrameSinceLastPressed>0) this._jumpFrameSinceLastPressed++;
        if (this._jumpFrameSinceLastPressed>this._jumpCooldown) this._jumpFrameSinceLastPressed = 0;
        if(this._isGrounded() && this._speed.y < 0){
            this._grounded = true;
            this._secondJumpUsed = false;
            this._speed.y = 0;
            if (this._input.jumpKeyDown && this._jumpFrameSinceLastPressed == 0){
                this._speed.y = Player.FIRST_JUMP_FORCE;
                this._jumpFrameSinceLastPressed = 1;
            }
        } else {
            if (this._input.jumpKeyDown && this._jumpFrameSinceLastPressed == 0 && !this._secondJumpUsed){
                this._speed.y = Player.SECOND_JUMP_FORCE;
                this._jumpFrameSinceLastPressed = 1;
                this._secondJumpUsed = true;
            }
        }
        if (this._speed.y < -Player.FALL_MAX_SPEED){
            this._speed.y = -Player.FALL_MAX_SPEED;
        }
        let y = this._speed.y
        this.mesh.position.y += this._speed.y;
        this._speed = this._speed.scaleInPlace(1 - Player.AIR_RESISTANCE);
        this._speed.y = y;
        this.mesh.moveWithCollisions(this._speed);
        //this.mesh.position = this.mesh.position.add(this._speed);
    }

    private _rotatePlayer(): void{
        //check if there is movement to determine if rotation is needed
        let input = new Vector3(this._input.horizontalAxis, 0, this._input.verticalAxis); //along which axis is the direction
        if (input.length() == 0) return;//if there's no input detected, prevent rotation and keep player in same rotation
        let angle = Math.atan2(-this._input.horizontalAxis, -this._input.verticalAxis);
        angle += Math.atan2(Math.cos(this.camera.alpha), Math.sin(this.camera.alpha));
        
        let targ = Quaternion.FromEulerAngles(0, angle, 0);
        this.mesh.rotationQuaternion = Quaternion.Slerp(this.mesh.rotationQuaternion, targ, 10 * this._deltaTime);
    }

    private _beforeRenderUpdate(): void {
        this._updateMovementFromInput();
        this._rotatePlayer();
        //this._animatePlayer();
    }

    public activatePlayerCamera(): ArcRotateCamera {
        this.scene.registerBeforeRender(() => {
            this._beforeRenderUpdate();
            this._updateCamera();
        })
        return this.camera;
    }

    private _animatePlayer(): void {
        if (this._input.inputMap["z"] || this._input.inputMap["q"] || this._input.inputMap["s"] || this._input.inputMap["d"])
        {
            if (this._currentAnim !== this._run && this._runStartCountFrame < this._runStarttoRunNbFrame)
            {
                this._currentAnim = this._runStart;
                this._runStartCountFrame++;
            } else {
                this._currentAnim = this._run;
                this._runStartCountFrame = 0;
            }
        } else {
            this._runStartCountFrame = 0;
            this._currentAnim = this._idle;
        }
        if(this._currentAnim != null && this._prevAnim !== this._currentAnim){
            this._prevAnim.stop();
            this._currentAnim.play(this._currentAnim.loopAnimation);
            this._prevAnim = this._currentAnim;
        }
        //console.log(this._currentAnim.name)
    }

    private _setUpAnimations(): void {
        this.scene.stopAllAnimations();
        this._runStart.loopAnimation = false;
        this._run.loopAnimation = true;
        this._idle.loopAnimation = true;

        //initialize current and previous
        this._currentAnim = this._idle;
        this._prevAnim = this._run;
    }

    
    private _floorRaycast(): boolean {
        let predicate = function (mesh) {
            return mesh.isPickable && mesh.isEnabled();
        }
        let eulerRotation = this.mesh.rotationQuaternion.toEulerAngles().y;
        //console.log(eulerRotation);
        let fwd = new Vector3(Math.cos(eulerRotation), 0, Math.sin(eulerRotation));
        let ray1 = new Ray(
            new Vector3(
                Player.WIDTH * fwd.x + this.mesh.position.x,
                this.mesh.position.y - Player.HEIGHT,
                Player.WIDTH * fwd.z + this.mesh.position.z
            ),
            Vector3.Down(),
            Player.FALL_MAX_SPEED * 2
        );
        let ray2 = new Ray(
            new Vector3(
                 - Player.WIDTH * fwd.x + this.mesh.position.x,
                this.mesh.position.y - Player.HEIGHT,
                Player.WIDTH * fwd.z + this.mesh.position.z
            ),
            Vector3.Down(),
            Player.FALL_MAX_SPEED * 2
        );
        let ray3 = new Ray(
            new Vector3(
                Player.WIDTH * fwd.x + this.mesh.position.x,
                this.mesh.position.y - Player.HEIGHT,
                - Player.WIDTH * fwd.z + this.mesh.position.z
            ),
            Vector3.Down(),
            Player.FALL_MAX_SPEED * 2
        );
        let ray4 = new Ray(
            new Vector3(
                - Player.WIDTH * fwd.x + this.mesh.position.x,
                this.mesh.position.y - Player.HEIGHT,
                - Player.WIDTH * fwd.z + this.mesh.position.z
            ),
            Vector3.Down(),
            Player.FALL_MAX_SPEED * 2
        );

        let pick1 = this.scene.pickWithRay(ray1, predicate);
        let pick2 = this.scene.pickWithRay(ray2, predicate);
        let pick3 = this.scene.pickWithRay(ray3, predicate);
        let pick4 = this.scene.pickWithRay(ray4, predicate);
        return pick1.hit || pick2.hit || pick3.hit || pick4.hit;
    }

    private _isGrounded(): boolean {
        let result = this._floorRaycast();
        return(result);
    }
}