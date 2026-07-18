export type Menu = "source" | "account" | "plans";

const MENU_IDS: Menu[] = ["source", "account", "plans"];

export function menuFromHash(hash: string): Menu {
  const id = hash.replace(/^#/, "");
  return (MENU_IDS as string[]).includes(id) ? (id as Menu) : "source";
}
