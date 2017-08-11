import {
	Component,
	OnInit,
	ContentChild,
	Input,
	Output,
	HostListener,
	ElementRef,
	ViewChild,
	EventEmitter
} from "@angular/core";
import { DropdownButton } from "./dropdown-button.component";
import { PillInput } from "./pill-input.component";
import { AbstractDropdownView } from "./../dropdown/abstract-dropdown-view.class";
import { ListItem } from "./../dropdown/list-item.interface";

@Component({
	selector: "n-combo-box",
	template: `
		<n-pill-input
			[pills]="pills"
			[placeholder]="placeholder"
			[displayValue]="selectedValue"
			[type]="type"
			[disabled]="disabled"
			(updatePills)="updatePills()"
			(search)="doSearch($event)"
			(submit)="doSubmit($event)">
		</n-pill-input>
		<ng-content></ng-content>
	`,
	host: {
		class: "combo",
		role: "combobox",
		"[attr.aria-expanded]": "dropdownButton?dropdownButton.open:false",
		"[attr.aria-disabled]": "disabled?true:null"
	}
})
export class ComboBox {
	public pills = [];
	public selectedValue = "";
	private dropdownList = [];
	private dropdown;
	/**
	 * List of items to fill the content with.
	 *
	 * **Example:**
	 * ```javascript
	 * items = [
	 *	{
	 *		content: "Abacus",
	 *		selected: false
	 *	},
	 *	{
	 *		content: "Byte",
	 *		selected: false,
	 *	},
	 *	{
	 *		content: "Computer",
	 *		selected: false
	 *	},
	 *	{
	 *		content: "Digital",
	 *		selected: false
	 *	}
	 * ];
	 * ```
	 *
	 * @type {Array<ListItem>}
	 * @memberof ComboBox
	 */
	@Input() items: Array<ListItem> = [];
	/**
	 * Text to show when nothing is selected.
	 *
	 * @memberof ComboBox
	 */
	@Input() placeholder = "";
	/**
	 * Combo box type.
	 *
	 * `"single"` | `"multi"`
	 *
	 * @type {("single" | "multi")}
	 * @memberof ComboBox
	 */
	@Input() type: "single" | "multi" = "single";
	/**
	 * Combo box size.
	 *
	 * `"sm"` | `"default"` | `"lg"`
	 *
	 * @type {("sm" | "default" | "lg")}
	 * @memberof ComboBox
	 */
	@Input() size: "sm" | "default" | "lg" = "default";
	/**
	 * Set to `true` to disable combobox.
	 *
	 * @memberof ComboBox
	 */
	@Input() disabled = false;
	@Output() selected: EventEmitter<ListItem> = new EventEmitter<ListItem>();
	@Output() submit: EventEmitter<any> = new EventEmitter<any>();
	@ContentChild(AbstractDropdownView) view: AbstractDropdownView;
	@ContentChild(DropdownButton) dropdownButton: DropdownButton;
	@ViewChild(PillInput) pillInput: PillInput;

	/**
	 * Creates an instance of ComboBox.
	 * @param {ElementRef} _elementRef
	 * @memberof ComboBox
	 */
	constructor(private _elementRef: ElementRef) {}

	/**
	 * Lifecycle hook.
	 *
	 * Updates pills if necessary.
	 *
	 * @param {any} changes
	 * @memberof ComboBox
	 */
	ngOnChanges(changes) {
		if (changes.items) {
			this.view["updateList"](changes.items.currentValue);
			this.updatePills();
		}
	}

	ngAfterContentInit() {
		this.dropdownButton.disabled = this.disabled;
		if (this.view) {
			this.view.type = this.type;
			this.view.select.subscribe((ev) => {
				if (this.type === "multi") {
					this.updatePills();
				} else {
					if (ev.item.selected) {
						this.selectedValue = ev.item.content;
					} else {
						this.selectedValue = "";
					}
					// not gaurding these since the nativeElement has to be loaded
					// for select to even fire
					this._elementRef.nativeElement.querySelector(".pill-input").focus();
					this._elementRef.nativeElement.querySelector(".combo-input").focus();
					this.dropdownButton.closeDropdown();
				}
				this.selected.emit(ev);
				this.view["filterBy"]("");
			});
			this.view["updateList"](this.items);
		}
	}

	ngAfterViewInit() {
		this.dropdown = this._elementRef.nativeElement.querySelector(".dropdown-menu");
		document.addEventListener("click", ev => {
			if (!this._elementRef.nativeElement.contains(ev.target)) {
				this.pillInput.expanded = false;
				if (this.dropdownButton.open) {
					this.dropdownButton.closeDropdown();
				}
			}
		});
	}

	@HostListener("keydown", ["$event"])
	hostkeys(ev: KeyboardEvent) {
		if (ev.key === "Escape") {
			this.dropdownButton.closeDropdown();
		} else if (ev.key === "ArrowDown" && !this.dropdown.contains(ev.target)) {
			ev.stopPropagation();
			setTimeout(() => this.view.getCurrentElement().focus(), 0);
		} else if (ev.key === "ArrowUp" && this.dropdown.contains(ev.target) && !this.view["hasPrevElement"]()) {
			// setTimeout(() => this.pillInput._elementRef.nativeElement.focus(), 0);
			this._elementRef.nativeElement.querySelector(".pill-input").focus();
			this._elementRef.nativeElement.querySelector(".combo-input").focus();
		}
	}

	public updatePills() {
		this.pills = this.view.getSelected() || [];
	}

	public doSearch(ev) {
		this.view["filterBy"](ev);
		if (ev !== "") {
			this.dropdownButton.closeDropdown();
		} else {
			this.selectedValue = "";
		}
		if (this.type === "single") {
			// deselect if the input doesn't match the content
			// of any given item
			if (!this.view.items.some(item => item.content === ev)) {
				let selected = this.view.getSelected();
				if (selected) { selected[0].selected = false; }
			} else {
				// otherwise we remove the filter
				this.view["filterBy"]("");
			}
		}
	}

	doSubmit(ev) {
		let index = 0;
		if (ev.after) {
			index = this.view.items.indexOf(ev.after) + 1;
		}
		this.submit.emit({
			items: this.view.items,
			index,
			value: {
				content: ev.value,
				selected: false
			}
		});
	}
}