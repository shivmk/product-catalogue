import { Router, type RequestHandler } from 'express';
import { EnquiryRequestSchema, type EnquiryResponse } from '@catalogue/shared';
import type { EnquiryService } from '../services/EnquiryService.js';
import { parseOrThrow } from './validation.js';

export function enquiryRoutes(enquiries: EnquiryService, rateLimit: RequestHandler): Router {
  const router = Router();

  router.post('/enquiries', rateLimit, async (req, res) => {
    const enquiry = parseOrThrow(
      EnquiryRequestSchema,
      req.body,
      'Please check the highlighted fields',
    );
    const result = await enquiries.submit(enquiry);
    // Log the reference only: no names, emails or phone numbers in logs.
    req.log.info(
      { enquiryId: result.enquiryId, productId: enquiry.productId, delivered: result.delivered },
      'Enquiry received',
    );
    res.status(201).json({ enquiryId: result.enquiryId } satisfies EnquiryResponse);
  });

  return router;
}
