'use client';

import { useState } from 'react';
import { Check, ChevronDown, Copy } from 'lucide-react';
import type { HttpMethod } from '@/types';
import { MethodBadge } from './method-badge';
import { cn } from '@/lib/utils';

export type EndpointExample = {
  title: string;
  method: HttpMethod;
  path: string;
  statusCode: number;
  body: Record<string, unknown> | unknown[];
};

const EXAMPLES: EndpointExample[] = [
  {
    title: 'Get a user by id',
    method: 'GET',
    path: '/users/:id',
    statusCode: 200,
    body: {
      id: '{{param.id}}',
      name: '{{faker.person.fullName}}',
      email: '{{faker.internet.email}}',
      avatar: '{{faker.image.avatar}}',
      jobTitle: '{{faker.person.jobTitle}}',
      createdAt: '{{faker.date.past}}',
    },
  },
  {
    title: 'List products',
    method: 'GET',
    path: '/products',
    statusCode: 200,
    body: {
      data: [
        {
          id: '{{faker.string.uuid}}',
          name: '{{faker.commerce.productName}}',
          price: '{{faker.commerce.price}}',
          department: '{{faker.commerce.department}}',
        },
        {
          id: '{{faker.string.uuid}}',
          name: '{{faker.commerce.productName}}',
          price: '{{faker.commerce.price}}',
          department: '{{faker.commerce.department}}',
        },
      ],
      page: 1,
      total: 2,
    },
  },
  {
    title: 'Create an order',
    method: 'POST',
    path: '/orders',
    statusCode: 201,
    body: {
      id: '{{faker.string.uuid}}',
      status: 'pending',
      amount: '{{faker.finance.amount}}',
      currency: '{{faker.finance.currencyCode}}',
      createdAt: '{{faker.date.recent}}',
    },
  },
  {
    title: 'Update a profile',
    method: 'PATCH',
    path: '/profiles/:id',
    statusCode: 200,
    body: {
      id: '{{param.id}}',
      city: '{{faker.location.city}}',
      country: '{{faker.location.country}}',
      phone: '{{faker.phone.number}}',
      updatedAt: '{{faker.date.recent}}',
    },
  },
  {
    title: 'Not found error',
    method: 'GET',
    path: '/orders/:id',
    statusCode: 404,
    body: { error: 'not_found', message: 'Order {{param.id}} does not exist' },
  },
  {
    title: 'Validation error',
    method: 'POST',
    path: '/signup',
    statusCode: 422,
    body: {
      errors: [{ field: 'email', message: 'The email field must be a valid email address' }],
    },
  },
];

/** Faker calls the API evaluates in response bodies: {{faker.<category>.<method>}}. */
const VARIABLES: { group: string; items: [string, string][] }[] = [
  {
    group: 'Path & ids',
    items: [
      ['{{param.id}}', 'Path parameter, e.g. :id in /users/:id'],
      ['{{faker.string.uuid}}', 'UUID'],
      ['{{faker.number.int}}', 'Integer'],
      ['{{faker.number.int({"min":1,"max":100})}}', 'Integer between 1 and 100'],
      ['{{faker.number.float}}', 'Decimal number'],
      ['{{faker.string.alphanumeric(8)}}', '8 random letters/digits'],
      ['{{faker.datatype.boolean}}', 'true or false'],
    ],
  },
  {
    group: 'Person',
    items: [
      ['{{faker.person.fullName}}', 'Full name'],
      ['{{faker.person.firstName}}', 'First name'],
      ['{{faker.person.lastName}}', 'Last name'],
      ['{{faker.person.jobTitle}}', 'Job title'],
      ['{{faker.image.avatar}}', 'Avatar image URL'],
      ['{{faker.phone.number}}', 'Phone number'],
    ],
  },
  {
    group: 'Internet',
    items: [
      ['{{faker.internet.email}}', 'Email address'],
      ['{{faker.internet.username}}', 'Username'],
      ['{{faker.internet.url}}', 'URL'],
      ['{{faker.internet.password}}', 'Password'],
    ],
  },
  {
    group: 'Location',
    items: [
      ['{{faker.location.streetAddress}}', 'Street address'],
      ['{{faker.location.city}}', 'City'],
      ['{{faker.location.country}}', 'Country'],
      ['{{faker.location.zipCode}}', 'Zip code'],
      ['{{faker.location.latitude}}', 'Latitude'],
      ['{{faker.location.longitude}}', 'Longitude'],
    ],
  },
  {
    group: 'Business',
    items: [
      ['{{faker.company.name}}', 'Company name'],
      ['{{faker.company.catchPhrase}}', 'Slogan'],
      ['{{faker.commerce.productName}}', 'Product name'],
      ['{{faker.commerce.price}}', 'Price'],
      ['{{faker.commerce.department}}', 'Department'],
      ['{{faker.finance.amount}}', 'Money amount'],
      ['{{faker.finance.currencyCode}}', 'Currency code, e.g. USD'],
    ],
  },
  {
    group: 'Text & dates',
    items: [
      ['{{faker.lorem.word}}', 'One word'],
      ['{{faker.lorem.sentence}}', 'Sentence'],
      ['{{faker.lorem.paragraph}}', 'Paragraph'],
      ['{{faker.color.human}}', 'Colour name'],
      ['{{faker.date.past}}', 'Past date (ISO)'],
      ['{{faker.date.recent}}', 'Recent date (ISO)'],
      ['{{faker.date.future}}', 'Future date (ISO)'],
    ],
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy ${text}`}
      onClick={() => {
        navigator.clipboard?.writeText(text).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          },
          () => {}
        );
      }}
      className="text-muted-foreground hover:text-foreground shrink-0 p-1 transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

/**
 * Help shown inside the endpoint create/edit form: ready-made endpoints to
 * start from, and the template variables a response body can use.
 */
export function EndpointExamples({ onUse }: { onUse: (example: EndpointExample) => void }) {
  const [tab, setTab] = useState<'examples' | 'variables'>('examples');
  const [open, setOpen] = useState(0);

  return (
    <div className="bg-muted/30 rounded-lg border">
      <div className="flex gap-1 border-b p-1" role="tablist">
        {(
          [
            ['examples', 'Examples'],
            ['variables', 'Faker variables'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              tab === id
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'examples' ? (
        <div className="divide-y">
          {EXAMPLES.map((ex, i) => {
            const expanded = open === i;
            return (
              <div key={ex.title}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? -1 : i)}
                  className="hover:bg-muted/50 flex w-full items-center gap-2 px-3 py-2 text-left"
                >
                  <MethodBadge method={ex.method} className="shrink-0" />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs">{ex.path}</span>
                  <span className="text-muted-foreground hidden text-xs sm:inline">{ex.title}</span>
                  <span className="text-muted-foreground font-mono text-xs">{ex.statusCode}</span>
                  <ChevronDown
                    className={cn(
                      'text-muted-foreground h-3.5 w-3.5 shrink-0 transition-transform',
                      expanded && 'rotate-180'
                    )}
                  />
                </button>
                {expanded && (
                  <div className="space-y-2 px-3 pb-3">
                    <pre className="bg-background max-h-56 overflow-auto rounded-md border p-2 font-mono text-xs">
                      {JSON.stringify(ex.body, null, 2)}
                    </pre>
                    <button
                      type="button"
                      onClick={() => onUse(ex)}
                      className="text-primary text-xs font-medium hover:underline"
                    >
                      Use this example
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="max-h-80 space-y-3 overflow-auto p-3">
          <p className="text-muted-foreground text-xs">
            Put these inside JSON strings; each request gets fresh values.
          </p>
          {VARIABLES.map((g) => (
            <div key={g.group}>
              <p className="text-foreground mb-1 text-xs font-semibold">{g.group}</p>
              <ul className="space-y-0.5">
                {g.items.map(([v, desc]) => (
                  <li key={v} className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate font-mono text-xs">{v}</code>
                    <span className="text-muted-foreground hidden shrink-0 text-xs sm:inline">
                      {desc}
                    </span>
                    <CopyButton text={v} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
