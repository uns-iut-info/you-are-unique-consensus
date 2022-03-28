import { ActionManager, ExecuteCodeAction, Scalar, Scene } from "@babylonjs/core";

export class PlayerInput{

    public inputMap : any;
    public dashing : boolean;
    public jumpKeyDown : boolean;
    
    public vertical : number = 0;
    public horizontal : number = 0;
    public horizontalAxis: number = 0;
    public verticalAxis: number = 0;
    
    constructor(scene: Scene) {
        scene.actionManager = new ActionManager(scene);
    
        this.inputMap = {};
        scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, (evt) => {
            this.inputMap[evt.sourceEvent.key] = evt.sourceEvent.type == "keydown";
        }));
        scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, (evt) => {
            this.inputMap[evt.sourceEvent.key] = evt.sourceEvent.type == "keydown";
        }));
        /*
        scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager., (evt) => {
            this.inputMap[evt.sourceEvent.key] = evt.sourceEvent.type == "keydown";
        }));
        */
        scene.onBeforeRenderObservable.add(() => {
            this._updateFromKeyboard();
        });
        this._lockMouse();
    }

    private _updateFromKeyboard() : void {
        if (this.inputMap["z"]) {
            this.vertical = Scalar.Lerp(this.vertical, 1, 0.2);
            this.verticalAxis = 1;
    
        } else if (this.inputMap["s"]) {
            this.vertical = Scalar.Lerp(this.vertical, -1, 0.2);
            this.verticalAxis = -1;
        } else {
            this.vertical = 0;
            this.verticalAxis = 0;
        }
    
        if (this.inputMap["q"]) {
            this.horizontal = Scalar.Lerp(this.horizontal, -1, 0.2);
            this.horizontalAxis = -1;
    
        } else if (this.inputMap["d"]) {
            this.horizontal = Scalar.Lerp(this.horizontal, 1, 0.2);
            this.horizontalAxis = 1;
        }
        else {
            this.horizontal = 0;
            this.horizontalAxis = 0;
        }
        //dash
        if (this.inputMap["Shift"]) {
            this.dashing = true;
        } else {
            this.dashing = false;
        }

        //Jump Checks (SPACE)
        if (this.inputMap[" "]) {
            this.jumpKeyDown = true;
        } else {
            this.jumpKeyDown = false;
        }
    }

    private _lockMouse() : void {
        let canva = document.getElementById("gameCanvas");
        // Requete pour la capture du pointeur
        canva.addEventListener("click", function(evt) {
            canva.requestPointerLock = canva.requestPointerLock || canva.requestPointerLock;
            if (canva.requestPointerLock) {
                canva.requestPointerLock();
            }
        }, false);
    
        // Evenement pour changer le paramètre de rotation
        var pointerlockchange = function (event) {
            let controlEnabled = (document.pointerLockElement === canva);
            let rotEngaged = true;
            if (!controlEnabled) {
                rotEngaged = false;
            } 
        };
        
        // Event pour changer l'état du pointeur, sous tout les types de navigateur
        document.addEventListener("pointerlockchange", pointerlockchange, false);
        document.addEventListener("mspointerlockchange", pointerlockchange, false);
        document.addEventListener("mozpointerlockchange", pointerlockchange, false);
        document.addEventListener("webkitpointerlockchange", pointerlockchange, false);
    }
}