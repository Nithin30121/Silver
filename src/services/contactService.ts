// SILVORA | Contact form
// Messages go to the shop's API, which saves them for the admin dashboard and, once email is set up,
// forwards them to the shop's inbox. The sender is never emailed by the server.

import { customerRequest } from './customerApi';

export interface ContactInput {
  name: string;
  email: string;
  phone: string;
  subject: string;
  orderNumber: string;
  message: string;
  /** A hidden field people never see; anything in it marks the message as spam. */
  website: string;
}

export function sendContactMessage(input: ContactInput): Promise<void> {
  return customerRequest<void>('/contact', 'We could not send your message. Please try again in a moment.',
    { method: 'POST', body: input, signIn: 'optional' });
}
