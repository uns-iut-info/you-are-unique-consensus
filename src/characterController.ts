import { AnimationGroup, ArcRotateCamera, Mesh, Quaternion, Ray, RuntimeAnimation, Scene, ShadowGenerator, TransformNode, UniversalCamera, Vector2, Vector3 } from "@babylonjs/core";

export class Player extends TransformNode {
    // Genral settings
    public static SPEED : number = 0.25;
    public static JUMP_FORCE : number = 0.40;
    public static GRAVITY : number = -0.8;
    public static DASH_FACTOR : number = 1.5;
    public static DASH_TIME : number = 50; //how many frames the dash lasts
    public static MAX_JUMP : number = 2;

    // Input settings

    public dashTime: number = 0;
    private _jumpCount: number = 2;

    // Camera
    private _camRoot: TransformNode;
    public camera: ArcRotateCamera;
    static ORIGINAL_TILT: Vector3 = new Vector3(Math.PI/8,0,0);

    // Scene
    public scene: Scene;

    //animations
    private _run: AnimationGroup;
    private _startRun: AnimationGroup;
    private _idle: AnimationGroup;
    private _jump: AnimationGroup;
    private _land: AnimationGroup;
    private _dash: AnimationGroup;
    private _currentAnim: AnimationGroup;
    private _prevAnim: AnimationGroup;
    
    //animations settings
    private _numberFrameSinceLastAnim : number = 0; 
    private _numberFrameStartRunToRun : number = 130;

    // Controls/Physics
    private _input;
    private _moveDirection;
    private _h: number;
    private _v: number;
    private _ax: number;
    private _az: number;
    private _vx: number;
    private _vz: number;
    private _inputAmt;
    private _grounded;
    private _gravity: Vector3 = new Vector3();
    private _lastGroundPos: Vector3 = Vector3.Zero();
    private _deltaTime;
    private _canDash : boolean;
    private _dashPressed : boolean;

    // Player
    public mesh: Mesh; //outer collisionbox of player

    constructor(assets, scene: Scene, shadowGenerator: ShadowGenerator, input?) {
        super("player", scene);
        this.scene = scene;
        
        this.mesh = assets.mesh;
        this.mesh.parent = this;
        this._setupPlayerCamera();
        console.log(assets.animationGroups);
        shadowGenerator.addShadowCaster(assets.mesh); //the player mesh will cast shadows
        this._input = input;
        this._startRun = assets.animationGroups[0];
        this._idle = assets.animationGroups[1];
        this._run = assets.animationGroups[3];
        this._setUpAnimations();
    }

    private _setupPlayerCamera() : ArcRotateCamera {
        //root camera parent that handles positioning of the camera to follow the player
        this._camRoot = new TransformNode("root");
        this._camRoot.position = new Vector3(0, 0, 0); //initialized at (0,0,0)
        //to face the player from behind (180 degrees)
        this._camRoot.rotation = new Vector3(0, Math.PI, 0);

        //our actual camera that's pointing at our root's position
        let canvas = document.getElementById("gameCanvas");
        //this.camera = new UniversalCamera("cam", new Vector3(0, 0, -30), this.scene);
        this.camera = new ArcRotateCamera("playerCamera", Math.PI/10, Math.PI/10, 10, new Vector3(0, 0, -30), this.scene)
        this.camera.lockedTarget = this._camRoot.position;
        //this.camera.fov = 0.47350045992678597;
        this.camera.parent = this._camRoot;
        this.camera.attachControl(true);

        this.scene.activeCamera = this.camera;
        return this.camera;
    }

    private _updateCamera(): void {
        let centerPlayer = this.mesh.position.y + 2;
        this._camRoot.position = Vector3.Lerp(this._camRoot.position, new Vector3(this.mesh.position.x, centerPlayer, this.mesh.position.z), 0.4);
    }

    private _updateFromControls(): void {
        this._deltaTime = this.scene.getEngine().getDeltaTime() / 1000.0;
        this._moveDirection = Vector3.Zero(); // vector that holds movement information
        this._h = this._input.horizontal; //x-axis
        this._v = this._input.vertical; //z-axis

        //--DASHING--
        //limit dash to once per ground/platform touch
        //can only dash when in the air
        if (this._input.dashing && !this._dashPressed && this._canDash && this._grounded) {
            this._canDash = false;
            this._dashPressed = true;
        }
        
        //--MOVEMENTS BASED ON CAMERA (as it rotates)--
        let fwd = new Vector3(Math.cos(this.camera.alpha), 0, Math.sin(this.camera.alpha));
        let right = new Vector3(Math.sin(this.camera.alpha), 0, -Math.cos(this.camera.alpha));
        
        let correctedVertical = fwd.scaleInPlace(this._v);
        let correctedHorizontal = right.scaleInPlace(this._h);
        //movement based off of camera's view
        let move = correctedHorizontal.addInPlace(correctedVertical);

        //clear y so that the character doesnt fly up, normalize for next step
        this._moveDirection = new Vector3((move).normalize().x, 0, (move).normalize().z);

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
        this._moveDirection = this._moveDirection.scaleInPlace(this._inputAmt * Player.SPEED);

        //check if there is movement to determine if rotation is needed
        let input = new Vector3(this._input.horizontalAxis, 0, this._input.verticalAxis); //along which axis is the direction
        if (input.length() == 0) {//if there's no input detected, prevent rotation and keep player in same rotation
            return;
        }

        let angle = Math.atan2(this._input.horizontalAxis, this._input.verticalAxis);
        angle += Math.atan2(Math.cos(this.camera.alpha), Math.sin(this.camera.alpha));
        
        let targ = Quaternion.FromEulerAngles(0, angle, 0);
        this.mesh.rotationQuaternion = Quaternion.Slerp(this.mesh.rotationQuaternion, targ, 10 * this._deltaTime);

    }

    private _beforeRenderUpdate(): void {
        this._updateFromControls();
        this._updateGroundDetection();
        this._animatePlayer();
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
            if (this._currentAnim == this._idle){
                this._numberFrameSinceLastAnim = 0;
            }
            if (this._currentAnim !== this._run && this._numberFrameSinceLastAnim < this._numberFrameStartRunToRun)
            {
                this._currentAnim = this._startRun;
            } else {
                this._currentAnim = this._run;
            }
        } else {
            this._currentAnim = this._idle;
        }
        console.log(this._currentAnim.name);
        if(this._currentAnim != null && this._prevAnim !== this._currentAnim){
            this._prevAnim.stop();
            this._currentAnim.play(this._currentAnim.loopAnimation);
            this._prevAnim = this._currentAnim;
            this._numberFrameSinceLastAnim = 0;
        }
        this._numberFrameSinceLastAnim++;
    }

    private _setUpAnimations(): void {
        this.scene.stopAllAnimations();
        this._startRun.loopAnimation = false;
        this._run.loopAnimation = true;
        this._idle.loopAnimation = true;

        //initialize current and previous
        this._currentAnim = this._idle;
        this._prevAnim = this._run;
    }

    private _floorRaycast(offsetx: number, offsetz: number, raycastlen: number): Vector3 {
        let raycastFloorPos = new Vector3(this.mesh.position.x + offsetx, this.mesh.position.y + 0.5, this.mesh.position.z + offsetz);
        let ray = new Ray(raycastFloorPos, Vector3.Up().scale(-1), raycastlen);
        let predicate = function (mesh) {
            return mesh.isPickable && mesh.isEnabled();
        }
        let pick = this.scene.pickWithRay(ray, predicate);
        if (pick.hit) return pick.pickedPoint;
        return Vector3.Zero();
    }

    private _isGrounded(): boolean {
        if (this._floorRaycast(0, 0, .6).equals(Vector3.Zero())) {
            return false;
        } else {
            return true;
        }
    }

    private _updateGroundDetection(): void {
        if (!this._isGrounded()) {
            //if the body isnt grounded, check if it's on a slope and was either falling or walking onto it
            if (this._checkSlope() && this._gravity.y <= 0) {
                //if you are considered on a slope, you're able to jump and gravity wont affect you
                this._gravity.y = 0;
                this._jumpCount = 1;
                this._grounded = true;
            } else {
                //keep applying gravity
                this._gravity = this._gravity.addInPlace(Vector3.Up().scale(this._deltaTime * Player.GRAVITY));
                this._grounded = false;
            }
        }
        //Jump detection
        if (this._input.jumpKeyDown && this._jumpCount > 0) {
            this._gravity.y = Player.JUMP_FORCE;
            this._jumpCount--;
        }
        //limit the speed of gravity to the negative of the jump power
        if (this._gravity.y < -Player.JUMP_FORCE) {
            this._gravity.y = -Player.JUMP_FORCE;
        }
        this.mesh.moveWithCollisions(this._moveDirection.addInPlace(this._gravity));
        if (this._isGrounded()) {
            this._gravity.y = 0;
            this._grounded = true;
            this._lastGroundPos.copyFrom(this.mesh.position);
            this._jumpCount = Player.MAX_JUMP; //allow for jumping
            //dashing reset
            this._canDash = true; //the ability to dash
            //reset sequence(needed if we collide with the ground BEFORE actually completing the dash duration)
            this.dashTime = 0;
            this._dashPressed = false;
        }
    }

    private _checkSlope(): boolean {
        //only check meshes that are pickable and enabled (specific for collision meshes that are invisible)
        let predicate = function (mesh) {
            return mesh.isPickable && mesh.isEnabled();
        }
        //4 raycasts outward from center
        let raycast = new Vector3(this.mesh.position.x, this.mesh.position.y + 0.5, this.mesh.position.z + .25);
        let ray = new Ray(raycast, Vector3.Up().scale(-1), 1.5);
        let pick = this.scene.pickWithRay(ray, predicate);

        let raycast2 = new Vector3(this.mesh.position.x, this.mesh.position.y + 0.5, this.mesh.position.z - .25);
        let ray2 = new Ray(raycast2, Vector3.Up().scale(-1), 1.5);
        let pick2 = this.scene.pickWithRay(ray2, predicate);

        let raycast3 = new Vector3(this.mesh.position.x + .25, this.mesh.position.y + 0.5, this.mesh.position.z);
        let ray3 = new Ray(raycast3, Vector3.Up().scale(-1), 1.5);
        let pick3 = this.scene.pickWithRay(ray3, predicate);

        let raycast4 = new Vector3(this.mesh.position.x - .25, this.mesh.position.y + 0.5, this.mesh.position.z);
        let ray4 = new Ray(raycast4, Vector3.Up().scale(-1), 1.5);
        let pick4 = this.scene.pickWithRay(ray4, predicate);

        if (pick.hit && !pick.getNormal().equals(Vector3.Up())) {
            if(pick.pickedMesh.name.includes("stair")) { 
                return true; 
            }
        } else if (pick2.hit && !pick2.getNormal().equals(Vector3.Up())) {
            if(pick2.pickedMesh.name.includes("stair")) { 
                return true; 
            }
        }
        else if (pick3.hit && !pick3.getNormal().equals(Vector3.Up())) {
            if(pick3.pickedMesh.name.includes("stair")) { 
                return true; 
            }
        }
        else if (pick4.hit && !pick4.getNormal().equals(Vector3.Up())) {
            if(pick4.pickedMesh.name.includes("stair")) { 
                return true; 
            }
        }
        return false;
    }
}