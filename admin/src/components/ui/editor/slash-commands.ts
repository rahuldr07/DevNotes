"use client";

import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { type SuggestionProps } from "@tiptap/suggestion";
import { type EditorBlock, filterBlocks } from "@/components/ui/editor/blocks";
import {
  SLASH_LISTBOX_ID,
  SlashMenu,
  type SlashMenuHandle,
  type SlashMenuProps,
} from "@/components/ui/editor/SlashMenu";

/**
 * `/` block menu, built on @tiptap/suggestion.
 *
 * Tiptap documents this utility as the way to build slash commands — the
 * slash extension in their examples is unpublished, so the recommended path
 * is to own the extension and let the utility handle matching, positioning
 * and the keymap. Positioning uses the plugin's managed `mount`, which keeps
 * the popup anchored to the caret through scrolls and layout shifts without
 * any listeners here.
 *
 * Accessibility: DOM focus never leaves the document, so the editor element
 * plays the combobox and the menu is its listbox. This extension is the only
 * place that can reach `editor.view.dom`, so it owns those attributes.
 */
export const slashCommandsPluginKey = new PluginKey("devnotes-slash-commands");

function setComboboxState(dom: HTMLElement, expanded: boolean) {
  if (expanded) {
    dom.setAttribute("aria-expanded", "true");
    dom.setAttribute("aria-controls", SLASH_LISTBOX_ID);
    dom.setAttribute("aria-haspopup", "listbox");
    return;
  }
  dom.removeAttribute("aria-expanded");
  dom.removeAttribute("aria-controls");
  dom.removeAttribute("aria-haspopup");
  dom.removeAttribute("aria-activedescendant");
}

export const SlashCommands = Extension.create({
  name: "slashCommands",

  addProseMirrorPlugins() {
    return [
      Suggestion<EditorBlock, EditorBlock>({
        editor: this.editor,
        pluginKey: slashCommandsPluginKey,
        char: "/",
        // Only at the start of a block or after a space, so a path typed
        // mid-sentence ("src/lib/notes.ts") never opens the menu.
        allowedPrefixes: [" "],
        startOfLine: false,

        // Inside code, "/" is just a character.
        allow: ({ editor }) =>
          !editor.isActive("codeBlock") && !editor.isActive("code"),

        items: ({ query }) => filterBlocks(query),

        command: ({ editor, range, props }) => {
          // Drop the "/query" text first so undo treats the insertion as one
          // step rather than leaving the typed slash behind.
          editor.chain().focus().deleteRange(range).run();
          props.run(editor);
        },

        render: () => {
          let renderer: ReactRenderer<SlashMenuHandle, SlashMenuProps> | null =
            null;
          let unmount: (() => void) | undefined;
          let editorDom: HTMLElement | null = null;

          const withA11yProps = (
            props: SuggestionProps<EditorBlock, EditorBlock>,
          ): SlashMenuProps => ({
            items: props.items,
            command: props.command,
            onActiveOptionChange: (optionId) => {
              if (!editorDom) return;
              if (optionId) {
                editorDom.setAttribute("aria-activedescendant", optionId);
              } else {
                editorDom.removeAttribute("aria-activedescendant");
              }
            },
          });

          const close = () => {
            unmount?.();
            unmount = undefined;
            if (editorDom) setComboboxState(editorDom, false);
          };

          return {
            onStart: (props) => {
              editorDom = props.editor.view.dom as HTMLElement;
              renderer = new ReactRenderer<SlashMenuHandle, SlashMenuProps>(
                SlashMenu,
                { props: withA11yProps(props), editor: props.editor },
              );
              setComboboxState(editorDom, true);
              unmount = props.mount?.(renderer.element as HTMLElement);
            },

            onUpdate: (props) => {
              renderer?.updateProps(withA11yProps(props));
            },

            onKeyDown: ({ event }) => {
              if (event.key === "Escape") {
                close();
                return true;
              }
              return renderer?.ref?.onKeyDown(event) ?? false;
            },

            onExit: () => {
              close();
              renderer?.destroy();
              renderer = null;
              editorDom = null;
            },
          };
        },
      }),
    ];
  },
});
