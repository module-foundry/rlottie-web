const EFFECT_HOOKS = new Set(["useEffect", "useInsertionEffect", "useLayoutEffect"]);

const getHookName = node => {
  if (node.callee.type === "Identifier") {
    return node.callee.name;
  }

  return undefined;
};

const isHook = name => /^use[A-Z]/u.test(name ?? "");

const create = context => {
  const functionStack = [];

  const enterFunction = () => {
    functionStack.push({ effectSeen: false });
  };

  const exitFunction = () => {
    functionStack.pop();
  };

  const inspectCall = node => {
    const state = functionStack.at(-1);

    if (state === undefined) {
      return;
    }

    const hookName = getHookName(node);

    if (!isHook(hookName)) {
      return;
    }

    if (EFFECT_HOOKS.has(hookName)) {
      state.effectSeen = true;

      return;
    }

    if (state.effectSeen) {
      context.report({
        node,
        data: { hookName },
        messageId: "hookAfterEffect",
      });
    }
  };

  return {
    CallExpression: inspectCall,
    FunctionExpression: enterFunction,
    FunctionDeclaration: enterFunction,
    ArrowFunctionExpression: enterFunction,
    "FunctionExpression:exit": exitFunction,
    "FunctionDeclaration:exit": exitFunction,
    "ArrowFunctionExpression:exit": exitFunction,
  };
};

export const hooksOrderRule = {
  create,
  meta: {
    schema: [],
    type: "suggestion",
    docs: {
      description: "Keep effect hooks after all other hooks",
    },
    messages: {
      hookAfterEffect: "Move {{hookName}} above effect hooks.",
    },
  },
};
