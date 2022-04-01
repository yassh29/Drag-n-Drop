//Drag and Drop interfaces
interface Draggable{
    dragStartHandler(event: DragEvent): void;
    dragEndHandler(event: DragEvent): void;
}

interface DragTarget{
    dragOverHandler(event: DragEvent): void;
    dropHandler(event: DragEvent): void;
    dragLeaveHandler(event: DragEvent): void;
}

enum ProjectStatus { Active, Finished } //enum for Project

//Project type
class Project {
    constructor(
        public id: string,
        public title: string,
        public description: string,
        public people: number,
        public status: ProjectStatus
    ){}
}

//Project State Management

type Listener<T> = (items: T[]) => void

class State<T>{
     //type of Listeners
    protected listeners: Listener<T>[] = []; //just like state management          
    //i.e) when we add a project changes occur and then its called 

    addListener(listenerFn: Listener<T>) {
        this.listeners.push(listenerFn)
    }
}

class ProjectState extends State<Project>{
    private projects: Project[] = []; //type project
    private static instance: ProjectState;


    private constructor() {
        super()
    } //private constructor to make a singleton class 
    //i.e) only 1 object can be created 

    static getInstance() {
        if (this.instance) {
            return this.instance
        }
        this.instance = new ProjectState()
        return this.instance
    }

    addProject(title: string, description: string, noOfPeople: number) { // args got form gatherUser 
        const newProject = new Project(Math.random().toString(), title, description, noOfPeople, ProjectStatus.Active)
        this.projects.push(newProject)
        this.updateListeners();
    }

    moveProject(projectId: string, newStatus: ProjectStatus) {
        const project = this.projects.find(prj => prj.id === projectId);
        if (project && project.status !== newStatus) {
            project.status = newStatus;
        }
        this.updateListeners();
    }

    updateListeners() {
        for (const listenerFn of this.listeners) { //when project is added, change is occured then iterate
            listenerFn(this.projects.slice()); //instead of returning og array, a copy is passed to listenerFn   
        }
    }
}
const projectState = ProjectState.getInstance() //global variable to be accessable throughout the class


//interface
interface Validatable{
    value: string | number;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
}

function validate(validatableInput: Validatable) {
    let isValid = true;
    if (validatableInput.required) {
        isValid = isValid && validatableInput.value.toString().trim().length !== 0
    }
    if (validatableInput.minLength != null && typeof validatableInput.value === "string") {
        isValid = isValid && validatableInput.value.length >= validatableInput.minLength;
    }
    if (validatableInput.maxLength != null && typeof validatableInput.value === "string") {
        isValid = isValid && validatableInput.value.length <= validatableInput.maxLength;
    }
    if (validatableInput.min != null && typeof validatableInput.value === "number") {
        isValid = isValid && validatableInput.value >= validatableInput.min
    }
    if (validatableInput.max != null && typeof validatableInput.value === "number") {
        isValid = isValid && validatableInput.value <= validatableInput.max
    }
    return isValid

}


//autobind decorator
function autobind(_1: any, _: string, description: PropertyDescriptor) {
    const originalMethod = description.value
    const adjMethod: PropertyDescriptor = {
        configurable: true,
        get() { 
            const boundFn = originalMethod.bind(this)
            return boundFn
        }
    }
    return adjMethod
}

//Component Base Class
abstract class Component<T extends HTMLElement, U extends HTMLElement> {
    templateElement: HTMLTemplateElement;
    hostElement: T;
    element: U

    constructor(templateId: string, hostElementId: string, insertAtStart: boolean, newElementId?: string) {
        //selection logic
        this.templateElement = document.getElementById(templateId)! as HTMLTemplateElement;
        this.hostElement = document.getElementById(hostElementId)! as T;

        //this will tell that importedNode is content of template templateElement.content and 
        //second parameter refers to deep cloning of that element
        const importedNode = document.importNode(this.templateElement.content, true)
        this.element = importedNode.firstElementChild as U; //getting the first child element in the template element
        if(newElementId)
            this.element.id = newElementId; //get whether the projects are active and relate it to the css
        this.attach(insertAtStart)
    }

    private attach(insertAtBeginning: boolean) {
        this.hostElement.insertAdjacentElement(insertAtBeginning ?"afterbegin" : "beforeend", this.element) //adding the element to hostElement before end as the list
        //of projects will be at the end
    }

    abstract configure(): void;
    abstract renderContent(): void; 
}

//ProjectItem class -> responsible for rendering a single item
class ProjectItem extends Component<HTMLUListElement, HTMLLIElement> implements Draggable{
    private project: Project

    get persons() {
        if (this.project.people === 1)
            return "1 person"
        else 
            return `${this.project.people} persons`
   }

    constructor(hostId: string, project: Project) {
        super("single-project", hostId, false, project.id);
        this.project = project 

        this.configure();
        this.renderContent();
    }

    @autobind
    dragStartHandler(event: DragEvent): void {
        event.dataTransfer!.setData("text/plain", this.project.id);
        event.dataTransfer!.effectAllowed = "move";
    }
    @autobind
    dragEndHandler(_: DragEvent): void {
        console.log("Dragend");
    }

    configure(): void {
        this.element.addEventListener("dragstart", this.dragStartHandler)
        this.element.addEventListener("dragend", this.dragEndHandler)
    }

    renderContent(): void {
        this.element.querySelector("h2")!.textContent = this.project.title;
        this.element.querySelector("h3")!.textContent = this.persons + " assigned";
        this.element.querySelector("p")!.textContent = this.project.description

    }
}


//Project List class
class ProjectList extends Component <HTMLDivElement, HTMLElement> implements DragTarget{
    assignedProjects: Project[] //assigned projects will be an array of the projects

    constructor(private type: "active" | "finished") { //get active or finished projects a new property of the class
        super("project-list", "app", false, `${type}-projects`);
        this.assignedProjects = [] //just to remove the  error of never being initialised, an empty array
        //is initialised

        this.configure()
        this.renderContent() //rendering the header
        //renderContent() will be called first always. When there is change in state then only renderProjects()
        //will be called
    }

    @autobind
    dragOverHandler(event: DragEvent) {
        if (event.dataTransfer! && event.dataTransfer.types[0] === "text/plain") {
            event.preventDefault() //compulsary for dropHandler
            const listEl = this.element.querySelector("ul")!;
            listEl.classList.add("droppable")
        }
    }

    @autobind
    dropHandler(event: DragEvent) {
        const prjId = event.dataTransfer!.getData("text/plain");
        projectState.moveProject(prjId, this.type === "active" ? ProjectStatus.Active : ProjectStatus.Finished)
    }

    @autobind
    dragLeaveHandler(event: DragEvent) {
        const listEl = this.element.querySelector("ul")!;
        listEl.classList.remove("droppable")
    }

    configure() {
        this.element.addEventListener("dragover", this.dragOverHandler)
        this.element.addEventListener("dragleave", this.dragLeaveHandler)
        this.element.addEventListener("drop", this.dropHandler)

        projectState.addListener((projects: Project[]) => {
            const relevantProjects = projects.filter(prj => {
                if (this.type === "active") //if project status is actiive
                    return prj.status === ProjectStatus.Active; //then return the status enum as ative
                return prj.status === ProjectStatus.Finished;   //else return finished
            });
            this.assignedProjects = relevantProjects //overriding the projects as something changed(new proj added)
            this.renderProjects() //after adding to projects, then render it to screen
        })        
    }

        renderContent() {
        const listId = `${this.type}-projects-list`; //based on types with a header
        this.element.querySelector("ul")!.id = listId //assigning ul the id of the type(finished | active)
        this.element.querySelector("h2")!.textContent = this.type.toUpperCase() + " PROJECTS"; //displaying the header (active|finished)
        //in uppercase
        
    }

    private renderProjects() { //every time change is made, this func is called
        const listEl = document.getElementById(`${this.type}-projects-list`)! as HTMLUListElement
        listEl.innerHTML="" //this will clear everything and again insert everything
        for (const prjItem of this.assignedProjects) {
                new ProjectItem(this.element.querySelector("ul")!.id, prjItem)
            //instead of creating manually insert from the list
            // const listItem = document.createElement("li") //adding as an li 
            // listItem.textContent = prjItem.title //assigning the title and adding it to list
            // listEl.appendChild(listItem) //appended created li to ul 
        }
    }
  
}



//Project Input Class
class ProjectInput extends Component <HTMLDivElement, HTMLFormElement>{
    titleInputElement: HTMLInputElement;
    descriptionInputElement: HTMLInputElement;
    peopleInputElement: HTMLInputElement;


    constructor() {
        super("project-input", "app", true, "user-input")

        //listeners
        this.titleInputElement = this.element.querySelector("#title") as HTMLInputElement //get input from title field using element proerty
        this.descriptionInputElement = this.element.querySelector("#description") as HTMLInputElement //get input from people field using element proerty
        this.peopleInputElement = this.element.querySelector("#people") as HTMLInputElement //get input from description field using element proerty

        //commented because of inheritance
        // //selection logic
        // this.templateElement = document.getElementById("project-input")! as HTMLTemplateElement;
        // this.hostElement = document.getElementById("app")! as HTMLDivElement;

        // //this will tell that importedNode is content of template templateElement.content and 
        // //second parameter refers to deep cloning of that element
        // const importedNode = document.importNode(this.templateElement.content, true)
        // this.element = importedNode.firstElementChild as HTMLFormElement //getting the first child element in the template element
        // this.element.id = "user-input"; //from app.css to design the elements 

    
        this.configure(); //configure called before attaching
    }

    configure() {    
        this.element.addEventListener("submit", this.submitHandler/*.bind(this)*/)
    }

    renderContent(): void {}

    private gatheredUserInput(): [string, string, number] | void {
        const enteredTitle = this.titleInputElement.value;
        const enteredDescription = this.descriptionInputElement.value;
        const enteredPeole = this.peopleInputElement.value;
        
        const titleValidatable: Validatable = {
            value: enteredTitle,
            required:true
        }
        const descriptionValidatable: Validatable = {
            value: enteredDescription,
            required: true,
            minLength:5
        }
        const peopleValidatable: Validatable = {
            value: +enteredPeole,
            required: true,
            min: 1,
            max: 5
        }
        
        if (!validate(titleValidatable) ||
            !validate(descriptionValidatable) ||
            !validate(peopleValidatable))
        {
            alert("Invalid input, try again!")
            return;
        } else {
            return [enteredTitle, enteredDescription, +enteredPeole]
        }
    }
            
    private clearInputs() {
        this.titleInputElement.value = "";
        this.descriptionInputElement.value = "";
        this.peopleInputElement.value = "";
    }



    @autobind
    private submitHandler(event: Event) {
        event.preventDefault()
        const userInput = this.gatheredUserInput()
        if (Array.isArray(userInput)) { //tuple in js is basic array so just checking whether it is an array or not
            const [title, description, people] = userInput
            projectState.addProject(title, description, people);
            this.clearInputs()
        } 
    }

    

}

const projInput = new ProjectInput()
const actPrjList = new ProjectList("active")
const finPrjList = new ProjectList("finished")