(async function main() {
  let BROWSER_ACTION_PORT = null;
  let CONTENT_SCRIPT_PORT = null;

  // The storage panel doesn't currently support "bigint", "undefined", "symbol" or "function"
  const ACCEPTABLE_TYPES = [
    "object",
    "boolean",
    "number",
    "string",
  ];

  const NEW_VALUES_BY_TYPE = {
    object: {zebras: "have stripes"},
    boolean: false,
    number: 42,
    string: "giraffes",
  }

  let nextKey = 1;
  let nextValue = 1;
  const map = new Map();
  map.set("a", "b");
  const set = new Set();
  set.add(1).add("a");
  const arrBuff = new ArrayBuffer(8);
  const bigint = 1n;
  const date = new Date(0);
  const regexp = /regexp/;

  function handleChange(changes, areaName) {}
  browser.storage.onChanged.addListener(handleChange);

  // Messages from the browserAction popup script
  const portMessageHandlers = new Map([
    ['browser-action-opened', () => console.log("browserAction popup script loaded")],
    ['bg-add-item', () => addItem('background-script')],
    ['bg-bulk-add-items', () => bulkAddItems('background-script')],
    ['bg-edit-item', () => editItem('background-script')],
    ['bg-bulk-edit-item', () => bulkEditItems('background-script')],
    ['bg-remove-item', () => removeItem('background-script')],
    ['bg-bulk-remove-items', () => bulkRemoveItems('background-script')],
    ['bg-remove-all-items', () => removeAllItems('background-script')],
    ['content-script-opened', () => console.log("content script loaded")],
    ['cs-add-item', () => addItem('content-script')],
    ['cs-bulk-add-items', () => bulkAddItems('content-script')],
    ['cs-edit-item', () => editItem('content-script')],
    ['cs-bulk-edit-item', () => bulkEditItems('content-script')],
    ['cs-remove-item', () => removeItem('content-script')],
    ['cs-bulk-remove-items', () => bulkRemoveItems('content-script')],
    ['cs-remove-all-items', () => removeAllItems('content-script')],
    // TODO add menu item for non-JSONifiable values above
    // TODO add menu item for all JSONifiable values
  ]);

  function handleConnect(port) {
    port.onMessage.addListener((portMessage) => {
      if (!BROWSER_ACTION_PORT && portMessage.sender === 'browser-action') {
        port.onDisconnect.addListener(() => {
          BROWSER_ACTION_PORT = null;
        });
        BROWSER_ACTION_PORT = port;
      } else if (!CONTENT_SCRIPT_PORT && portMessage.sender === 'content-script') {
        port.onDisconnect.addListener(() => {
          CONTENT_SCRIPT_PORT = null;
        });
        CONTENT_SCRIPT_PORT = port;
      }
      if (portMessageHandlers.has(portMessage.type)) {
        return portMessageHandlers.get(portMessage.type)(portMessage, port);
      }

      return undefined;
    });
  }

  async function addItem(fromScript) {
    const item = {[String(nextKey)]: nextValue};
    if (fromScript === 'content-script') {
      await CONTENT_SCRIPT_PORT.postMessage({type: 'cs-add-item', item});
    } else {
      await browser.storage.local.set(item);
    }
    console.log(`${fromScript} added item: `, item);
    nextKey++;
    nextValue++;
  }

  async function bulkAddItems(fromScript) {
    const items = {};
    for (let i = 1; i <= 10; i++) {
      const item = {};
      items[nextKey] = nextValue;
      nextKey++;
      nextValue++;
    }
    if (fromScript === 'content-script') {
      await CONTENT_SCRIPT_PORT.postMessage({type: 'cs-bulk-add-items', items});
    } else {
      await browser.storage.local.set(items);
    }
    console.log(`${fromScript} bulk added items: `, items);
  }

  async function editItem(fromScript) {
    console.log("editItem");
    const allItemsKeys = Object.keys(await browser.storage.local.get());
    if (allItemsKeys.length === 0) {
      console.error('There are no items in extension storage local. To edit an item, please add one or more storage items first.');
      return;
    } else {
      // Select a random item to edit
      const randomIndex = Math.floor(Math.random() * allItemsKeys.length);
      const randomKey = allItemsKeys[randomIndex];
      const randomItem = await browser.storage.local.get(randomKey);

      // Determine the type of its current value
      const randomValue = randomItem[randomKey];
      const type = typeof randomValue;

      // Set its new value to a value of a different, random type. Changing the type of the value
      // ensures the value actually changes.
      const newTypeRandomIndex = Math.floor(Math.random() * (ACCEPTABLE_TYPES.length - 1));
      const newType = (ACCEPTABLE_TYPES.filter(t => t !== type))[newTypeRandomIndex];
      const newValue = NEW_VALUES_BY_TYPE[newType];

      const item = {[randomKey]: newValue};
      if (fromScript === 'content-script') {
        await CONTENT_SCRIPT_PORT.postMessage({type: 'cs-edit-item', item}); 
      } else {
        await browser.storage.local.set(item);
      }
      console.log(`${fromScript} edited item `, randomItem, "; it is now ", item);
    }
  }
  async function bulkEditItems(fromScript) {/* TODO */}
  async function removeItem(fromScript) {/* TODO */}
  async function bulkRemoveItems(fromScript) {/* TODO */}
  async function removeAllItems(fromScript) {/* TODO */}

  // Register centralized message handlers
  browser.runtime.onConnect.addListener(handleConnect);
}());
