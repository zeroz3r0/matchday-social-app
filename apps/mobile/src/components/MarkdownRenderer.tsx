// ============================================================================
// MarkdownRenderer — Presentation layer for legal markdown
// ----------------------------------------------------------------------------
// Thin RN wrapper over @matchday/shared parseMarkdown. Function component, no
// hooks (mobile convention: no useCallback / useMemo / forwardRef in NEW
// components). All visual tokens come from the consumer-provided style dict.
//
// Supported feature allowlist enforced upstream by tokensToNodes; unknown
// tokens degrade to plain text per design §8/§9.
// ============================================================================

import React from 'react';
import { Text, View, type TextStyle, type ViewStyle } from 'react-native';
import {
  parseMarkdown,
  type InlineNode,
  type ListItemNode,
  type RenderNode,
} from '@matchday/shared';
import { captureException } from '../lib/sentry';

export interface MarkdownStyleDict {
  body?: TextStyle;
  heading1?: TextStyle;
  heading2?: TextStyle;
  heading3?: TextStyle;
  paragraph?: TextStyle;
  strong?: TextStyle;
  bullet_list?: ViewStyle;
  list_item?: TextStyle;
  blockquote?: ViewStyle;
  code_inline?: TextStyle;
  hr?: ViewStyle;
}

export interface MarkdownRendererProps {
  source: string;
  styles: MarkdownStyleDict;
}

// ----- inline rendering ------------------------------------------------------

function renderInline(node: InlineNode, styles: MarkdownStyleDict, key: string): React.ReactNode {
  switch (node.type) {
    case 'text':
      return node.value;
    case 'strong':
      return (
        <Text key={key} style={styles.strong}>
          {node.children.map((child, i) => renderInline(child, styles, `${key}-s${i}`))}
        </Text>
      );
    case 'codespan':
      return (
        <Text key={key} style={styles.code_inline}>
          {node.value}
        </Text>
      );
  }
}

function renderInlines(children: InlineNode[], styles: MarkdownStyleDict, prefix: string) {
  return children.map((child, i) => renderInline(child, styles, `${prefix}-i${i}`));
}

// ----- list-item rendering ---------------------------------------------------

function renderListItem(
  item: ListItemNode,
  styles: MarkdownStyleDict,
  key: string,
): React.ReactNode {
  return (
    <Text key={key} style={[styles.body, styles.list_item]}>
      {'\u2022 '}
      {renderInlines(item.children, styles, key)}
    </Text>
  );
}

// ----- block rendering -------------------------------------------------------

function renderBlock(node: RenderNode, styles: MarkdownStyleDict, key: string): React.ReactNode {
  switch (node.type) {
    case 'heading': {
      const headingStyle =
        node.level === 1 ? styles.heading1 : node.level === 2 ? styles.heading2 : styles.heading3;
      // Compose body color/lineHeight first, then headingN-specific overrides.
      return (
        <Text key={key} style={[styles.body, headingStyle]}>
          {renderInlines(node.children, styles, key)}
        </Text>
      );
    }
    case 'paragraph':
      return (
        <Text key={key} style={[styles.body, styles.paragraph]}>
          {renderInlines(node.children, styles, key)}
        </Text>
      );
    case 'blockquote':
      return (
        <View key={key} style={styles.blockquote}>
          <Text style={[styles.body, styles.paragraph]}>
            {renderInlines(node.children, styles, key)}
          </Text>
        </View>
      );
    case 'list':
      return (
        <View key={key} style={styles.bullet_list}>
          {node.items.map((item, i) => renderListItem(item, styles, `${key}-li${i}`))}
        </View>
      );
    case 'hr':
      return <View key={key} style={styles.hr} />;
    case 'unknown':
      return (
        <Text key={key} style={[styles.body, styles.paragraph]}>
          {node.raw}
        </Text>
      );
  }
}

// ----- component -------------------------------------------------------------

export function MarkdownRenderer(props: MarkdownRendererProps): React.JSX.Element {
  const { source, styles } = props;
  let nodes: RenderNode[] = [];
  try {
    nodes = parseMarkdown(source);
  } catch (err) {
    captureException(err);
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error('[MarkdownRenderer] parse failed:', err);
    }
    return <Text style={styles.body}>{source}</Text>;
  }
  return <View>{nodes.map((node, i) => renderBlock(node, styles, `b${i}`))}</View>;
}
