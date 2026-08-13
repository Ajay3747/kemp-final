// Valid seller-driven order status transitions. Enforced server-side only —
// the frontend never decides whether a transition is legal.
const ALLOWED_TRANSITIONS = {
  PENDING: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['READY_FOR_HANDOVER', 'CANCELLED'],
  READY_FOR_HANDOVER: ['COMPLETED'],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: []
};

function isValidTransition(fromStatus, toStatus) {
  const allowed = ALLOWED_TRANSITIONS[fromStatus];
  return Array.isArray(allowed) && allowed.includes(toStatus);
}

function isTerminalStatus(status) {
  return status === 'COMPLETED' || status === 'REJECTED' || status === 'CANCELLED';
}

const BUYER_NOTIFICATION_MESSAGES = {
  ACCEPTED: 'Your deal has been accepted.',
  PROCESSING: 'Your order is now being processed.',
  READY_FOR_HANDOVER: 'Your order is ready for handover.',
  COMPLETED: 'Your order has been completed.',
  CANCELLED: 'Your deal has been cancelled.',
  REJECTED: 'Your deal request was rejected.'
};

module.exports = {
  ALLOWED_TRANSITIONS,
  isValidTransition,
  isTerminalStatus,
  BUYER_NOTIFICATION_MESSAGES
};
