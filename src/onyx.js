const unsentrify = (obj) => Object.keys(obj).reduce((acc, x) => { acc[x] = obj[x].__sentry_original__ ?? obj[x]; return acc; }, {});

const prettifyString = (str) => str.replaceAll('_', ' ').split(' ').map(x => x[0].toUpperCase() + x.slice(1)).join(' ');

// discord's toast for simplicity
const toast = (content, type) => goosemod.webpackModules.findByProps('showToast').showToast(goosemod.webpackModules.findByProps('createToast').createToast(content, type, { duration: 5000, position: 1 }));

const permissions = {
  token_read: [ 'getToken', 'showToken' ], // get + show
  token_write: [ 'setToken', 'removeToken', 'hideToken', 'showToken' ], // set + more general
  actions_typing: [ 'startTyping', 'stopTyping' ],
  actions_send: [ 'sendMessage' ],
  readacc_username: [ 'getCurrentUser@username' ],
  readacc_discrim: [ 'getCurrentUser@discriminator' ],
  readacc_email: [ 'getCurrentUser@email' ],
  readacc_phone: [ 'getCurrentUser@phone' ],
  friends_readwho: [ 'getRelationships', 'isFriend' ],
  // friends_check_friend: [ 'isFriend' ],
  // friends_check_blocked: [ 'isBlocked' ],
  status_readstatus: [ 'getStatus', 'isMobileOnline' ],
  status_readactivities: [ 'findActivity', 'getActivities', 'getActivityMetadata', 'getAllApplicationActivities', 'getApplicationActivity', 'getPrimaryActivity' ]
};

const complexMap = Object.keys(permissions).reduce((acc, x) => acc.concat(permissions[x].filter(y => y.includes('@')).map(y => [ x, ...y.split('@') ])), []);

const mimic = (orig) => {
  const origType = typeof orig; // mimic original value with empty of same type to try and not cause any errors directly

  if (origType === 'function') return () => ({}); // return empty object instead of just undefined to play nicer

  return window[origType[0].toUpperCase() + origType.slice(1)]();
};

const parseStack = (stack) => [...stack.matchAll(/^    at (.*?)( \[as (.*)\])? \((.*)\)$/gm)].map(x => ({
  func: x[1],
  alias: x[3],
  source: x[4],
  sourceType: x[4].startsWith('Topaz') ? 'topaz' : (x[4].startsWith('https://discord.com') ? 'discord' : (x[4] === '<anonymous>' ? 'anonymous' : 'unknown'))
}));

const shouldPermitViaStack = () => {
  const stack = parseStack(Error().stack).slice(2, -2); // slice away onyx wrappers

  const inClone = stack.find(x => (x.func === 'assign' || x.func === 'Function.assign') && x.source === '<anonymous>');

  const internalDiscordClone = inClone && stack[1].sourceType === 'discord';

  return internalDiscordClone;
};

const perms = {
  'Token': {
    'Read your token': 'token_read',
    'Set your token': 'token_write'
  },
  'Actions': {
    'Set typing state': 'actions_typing',
    'Send messages': 'actions_send'
  },
  'Account': {
    'See your username': 'readacc_username',
    'See your discriminator': 'readacc_discrim',
    'See your email': 'readacc_email',
    'See your phone number': 'readacc_phone'
  },
  'Friends': {
    'See who you are friends with': 'friends_readwho'
  },
  'Status': {
    'See status of users': 'status_readstatus',
    'See activities of users': 'status_readactivities'
  }
};


const permissionsModal = async (manifest, neededPerms) => {
  const ButtonColors = goosemod.webpackModules.findByProps('button', 'colorRed');

  const Text = goosemod.webpackModules.findByDisplayName("Text");
  const Markdown = goosemod.webpackModules.find((x) => x.displayName === 'Markdown' && x.rules);

  const Checkbox = goosemod.webpackModules.findByDisplayName('Checkbox');

  const { React } = goosemod.webpackModules.common;


  class Permission extends React.PureComponent {
    render() {
      const subPerm = Object.values(perms).find(x => Object.values(x).find(y => y === this.props.perm));
      const name = `${Object.keys(perms)[Object.values(perms).indexOf(subPerm)]} > ${Object.keys(subPerm).find(x => subPerm[x] === this.props.perm)}`;

      return React.createElement(Checkbox, {
        type: 'inverted',
        value: this.props.checked,
        onChange: () => {
          this.props.checked = !this.props.checked;
          this.forceUpdate();

          this.props.onChange(this.props.checked);
        },

        className: 'topaz-permission-choice'
      },
        React.createElement(Text, {
          variant: 'text-sm/normal'
        }, name)
      );
    }
  }

  const finalPerms = neededPerms.reduce((acc, x) => { acc[x] = true; return acc; }, {});

  const permsIncludesReads = neededPerms.some(x => x.includes('read'));
  const permsIncludesWrites = neededPerms.some(x => x.includes('write'));
  const permsIncludesActions = neededPerms.some(x => x.includes('action'));

  let permsTypes = [
    permsIncludesReads ? 'read sensitive data' : null,
    permsIncludesWrites ? 'write sensitive data' : null,
    permsIncludesActions ? 'perform senstive actions' : null,
  ].filter(x => x);

  if (permsTypes.length === 1) permsTypes = permsTypes[0];
    else if (permsTypes.length === 2) permsTypes = permsTypes.join(' and ');
    else permsTypes = permsTypes.slice(0, permsTypes.length - 1).join(', ') + ', and ' + permsTypes[permsTypes.length - 1];

  permsTypes = permsTypes.replace('read sensitive data, write sensitive data', 'read and write sensitive data').replace('read sensitive data and write sensitive data', 'read and write sensitive data');

  const res = await new Promise((res) => goosemod.webpackModules.findByProps('openModal', 'updateModal').openModal(e => {
    if (e.transitionState === 3) res(false);

    return React.createElement(goosemod.webpackModules.findByDisplayName("ConfirmModal"), {
      header: `${manifest.name} requires permissions`,
      confirmText: `Allow Chosen`,
      cancelText: `Deny All`,
      confirmButtonColor: ButtonColors.colorBrand,
      onClose: () => res(false), // General close (?)
      onCancel: () => { // Cancel text
        res(false);
        e.onClose();
      },
      onConfirm: () => { // Confirm button
        res(true);
        e.onClose();
      },
      transitionState: e.transitionState
    },
      ...(`Topaz requires your permission before allowing **${manifest.name}** to ${permsTypes}:`).split('\n').map((x) => React.createElement(Markdown, {
        size: Text.Sizes.SIZE_16
      }, x)),

      ...Object.keys(finalPerms).map(x => React.createElement(Permission, {
        perm: x,
        onChange: y => finalPerms[x] = y,
        checked: finalPerms[x]
      }))
    );
  }));

  if (res === false) { // Deny all
    for (const x in finalPerms) {
      finalPerms[x] = false;
    }
  }

  return finalPerms;
};


// we have to use function instead of class because classes force strict mode which disables with
const Onyx = function (entityID, manifest) {
  const context = {};

  // todo: don't allow localStorage, use custom storage api internally
  // todo: filter elements for personal info?
  const allowGlobals = [ 'topaz', 'localStorage', 'document', 'setTimeout', 'setInterval', 'clearInterval' ];

  // nullify (delete) all keys in window to start except allowlist
  for (const k of Object.keys(window)) { // for (const k of Reflect.ownKeys(window)) {
    if (allowGlobals.includes(k)) continue;
    context[k] = null;
  }

  // wrap webpack in our safety wrapper
  context.goosemod = {
    ...goosemod
  };

  context.goosemod.webpackModules = Object.keys(goosemod.webpackModules).reduce((acc, x) => {
    let orig = goosemod.webpackModules[x];
  
    if (typeof orig !== 'function') { // just do non funcs (common)
      acc[x] = orig;
    } else {
      orig = orig.bind({}); // clone function

      const all = x.toLowerCase().includes('all');
      acc[x] = all ? (...args) => orig(...args).map(x => this.safeWebpack(x)) : (...args) => this.safeWebpack(orig(...args));
    }

    return acc;
  }, {});

  context.goosemodScope = context.goosemod; // goosemod alias

  context.console = unsentrify(window.console); // unsentrify console funcs

  context.window = context; // recursive global

  // mock node
  context.global = context;

  context.module = {};

  // custom globals
  context.__entityID = entityID;


  this.entityID = entityID;
  this.manifest = manifest;
  this.context = Object.assign(context);

  let predictedPerms = [];
  this.eval = function (_code) {
    const code = _code + '\n\n;module.exports'; // return module.exports

    // basic static code analysis for predicting needed permissions
    // predictedPerms = Object.keys(permissions).filter(x => permissions[x].some(y => code.includes('.' + y)));
    // topaz.log('onyx', 'predicted perms for', this.manifest.name, predictedPerms);

    with (this.context) {
      return eval(code);
    }
  };

  let accessedPermissions = {};
  let firstAccess;

  this.safeWebpack = function (mod) {
    const checkPerms = (target, prop, reciever, missingPerm, givenPermissions) => {
      if (!missingPerm) return Reflect.get(target, prop, reciever);

      // toast(`[Topaz] ${name}: Blocked accessing (${prop})`, 2);

      if (!accessedPermissions[missingPerm] && givenPermissions[missingPerm] === undefined) { // First time asking
        accessedPermissions[missingPerm] = true;
        if (!firstAccess) {
          firstAccess = performance.now();

          setTimeout(async () => {
            firstAccess = null;

            const resultPerms = await permissionsModal(this.manifest, Object.keys(accessedPermissions).concat(predictedPerms));
            Object.keys(resultPerms).forEach(x => delete accessedPermissions[x]);

            // save permission allowed/denied
            const store = JSON.parse(localStorage.getItem('topaz_permissions') ?? '{}');
            if (!store[this.entityID]) store[this.entityID] = {};

            store[this.entityID] = {
              ...store[this.entityID],
              ...resultPerms
            };

            localStorage.setItem('topaz_permissions', JSON.stringify(store));

            /* if (!given && missingPerm === 'token_read') {
              goosemod.showToast(`Halting ${this.manifest.name} as it is potentially dangerous and denied token`, { timeout: 10000, subtext: 'Topaz', type: 'error' });
              throw new Error('Onyx halting potentially dangerous execution');
            } */

            setTimeout(() => topaz.reload(this.entityID), 500); // reload plugin
          }, 500);
        }
      } else if (givenPermissions[missingPerm] === false) {
        // goosemod.showToast(`Blocked ${this.manifest.name} from accessing ${prop} as it lacks ${prettifyString(missingPerm.replace('_', ' - '))} permission`, { subtext: 'Topaz', type: 'warning' });
      }

      // throw new Error('Onyx blocked access to dangerous property in Webpack: ' + prop);

      return mimic(Reflect.get(target, prop, reciever));
    };

    let keys = [];
    try {
      keys = Reflect.ownKeys(mod).concat(Reflect.ownKeys(mod.__proto__ ?? {}));
    } catch { }

    // if (keys.includes('Blob')) throw new Error('Onyx blocked access to window in Webpack', mod); // block window

    const hasFlags = keys.some(x => typeof x === 'string' && Object.values(permissions).flat().some(y => x === y.split('@')[0])); // has any keys in it
    return hasFlags ? new Proxy(mod, { // make proxy only if potential
      get: (target, prop, reciever) => {
        const givenPermissions = JSON.parse(localStorage.getItem('topaz_permissions') ?? '{}')[this.entityID] ?? {};
        const complexPerms = complexMap.filter(x => x[1] === prop);

        if (complexPerms.length !== 0) {
          const prox = (toProx) => new Proxy(toProx, {
            get: (sTarget, sProp, sReciever) => {
              if (shouldPermitViaStack()) return Reflect.get(sTarget, sProp, sReciever);

              return checkPerms(sTarget, sProp, sReciever, complexPerms.find(x => x[2] === sProp && givenPermissions[x[0]] !== true)?.[0], JSON.parse(localStorage.getItem('topaz_permissions') ?? '{}')[this.entityID] ?? {});
            }
          });

          const orig = Reflect.get(target, prop, reciever);

          if (typeof orig === 'function') return function() {
            return prox(orig.apply(this, arguments));
          };

          if (typeof orig === 'object') return prox(orig);
        }

        return checkPerms(target, prop, reciever, Object.keys(permissions).find(x => permissions[x].includes(prop) && givenPermissions[x] !== true), givenPermissions);
      }
    }) : mod;
  };

  topaz.log('onyx', 'created execution container successfully');
};

Onyx //# sourceURL=Onyx