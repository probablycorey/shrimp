/**
 * How to use a Signal:
 *
 * Create a signal:
 *    const chatSignal = new Signal<{ username: string, message: string }>()
 *
 * Connect to the signal:
 *    const disconnect = chatSignal.connect((data) => {
 *      const {username, message} = data;
 *      console.log(`${username} said "${message}"`);
 *    })
 *
 * Emit a signal:
 *    chatSignal.emit({ username: "Chad", message: "Hey everyone, how's it going?" });
 *
 * Forward a signal:
 *    const relaySignal = new Signal<{ username: string, message: string }>()
 *    const disconnectRelay = chatSignal.connect(relaySignal)
 *    // Now, when chatSignal emits, relaySignal will also emit the same data
 *
 * Disconnect a single listener:
 *    disconnect(); // The disconnect function is returned when you connect to a signal
 *
 * Disconnect all listeners:
 *    chatSignal.disconnect()
 */

export class Signal<T extends object | void> {
  private listeners: Array<(data: T) => void> = []

  connect(listenerOrSignal: Signal<T> | ((data: T) => void)) {
    let listener: (data: T) => void

    // If it is a signal, forward the data to the signal
    if (listenerOrSignal instanceof Signal) {
      listener = (data: T) => listenerOrSignal.emit(data)
    } else {
      listener = listenerOrSignal
    }

    this.listeners.push(listener)

    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  emit(data: T) {
    for (const listener of this.listeners) {
      listener(data)
    }
  }

  disconnect() {
    this.listeners = []
  }
}
