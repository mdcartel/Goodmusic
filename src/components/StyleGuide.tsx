'use client';

import React, { useState } from 'react';
import { Typography, Card, Button, Input, Badge, Loading, Status, Layout } from '@/components/ui/DesignSystem';
import { ThemeToggle, ColorSchemeSelector } from '@/contexts/ThemeContext';
import { designTokens, getMoodColor } from '@/styles/design-tokens';
import { cn } from '@/lib/utils';

export default function StyleGuide() {
  const [showStyleGuide, setShowStyleGuide] = useState(false);

  if (!showStyleGuide) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <Button.Root
          onClick={() => setShowStyleGuide(true)}
          variant="secondary"
          size="sm"
          className="shadow-lg"
        >
          🎨 Style Guide
        </Button.Root>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen p-8">
        <Layout.Container>
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <Typography.H1 className="mb-2">VibePipe Design System</Typography.H1>
              <Typography.Body variant="muted">
                Comprehensive design tokens, components, and patterns
              </Typography.Body>
            </div>
            
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <ColorSchemeSelector />
              <Button.Root
                onClick={() => setShowStyleGuide(false)}
                variant="ghost"
                size="sm"
              >
                ✕ Close
              </Button.Root>
            </div>
          </div>

          <div className="space-y-12">
            {/* Colors */}
            <section>
              <Typography.H2 className="mb-6">Colors</Typography.H2>
              
              <div className="space-y-8">
                {/* Brand Colors */}
                <div>
                  <Typography.H3 className="mb-4">Brand Colors</Typography.H3>
                  <Layout.Grid cols={2} gap={6}>
                    <Card.Root>
                      <Card.Header>
                        <Typography.H4>Primary (Purple)</Typography.H4>
                      </Card.Header>
                      <Card.Content>
                        <div className="grid grid-cols-5 gap-2">
                          {Object.entries(designTokens.colors.primary).map(([shade, color]) => (
                            <div key={shade} className="text-center">
                              <div 
                                className="w-full h-12 rounded-lg mb-2"
                                style={{ backgroundColor: color }}
                              />
                              <Typography.Caption>{shade}</Typography.Caption>
                              <Typography.Caption className="block font-mono">
                                {color}
                              </Typography.Caption>
                            </div>
                          ))}
                        </div>
                      </Card.Content>
                    </Card.Root>

                    <Card.Root>
                      <Card.Header>
                        <Typography.H4>Secondary (Pink)</Typography.H4>
                      </Card.Header>
                      <Card.Content>
                        <div className="grid grid-cols-5 gap-2">
                          {Object.entries(designTokens.colors.secondary).map(([shade, color]) => (
                            <div key={shade} className="text-center">
                              <div 
                                className="w-full h-12 rounded-lg mb-2"
                                style={{ backgroundColor: color }}
                              />
                              <Typography.Caption>{shade}</Typography.Caption>
                              <Typography.Caption className="block font-mono">
                                {color}
                              </Typography.Caption>
                            </div>
                          ))}
                        </div>
                      </Card.Content>
                    </Card.Root>
                  </Layout.Grid>
                </div>

                {/* Mood Colors */}
                <div>
                  <Typography.H3 className="mb-4">Mood Colors</Typography.H3>
                  <Card.Root>
                    <Card.Content>
                      <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
                        {Object.entries(designTokens.colors.mood).map(([mood, color]) => (
                          <div key={mood} className="text-center">
                            <div 
                              className="w-full h-16 rounded-lg mb-2"
                              style={{ backgroundColor: color }}
                            />
                            <Typography.Caption className="capitalize">{mood}</Typography.Caption>
                            <Typography.Caption className="block font-mono text-xs">
                              {color}
                            </Typography.Caption>
                          </div>
                        ))}
                      </div>
                    </Card.Content>
                  </Card.Root>
                </div>
              </div>
            </section>

            {/* Typography */}
            <section>
              <Typography.H2 className="mb-6">Typography</Typography.H2>
              
              <Card.Root>
                <Card.Content>
                  <Layout.Stack spacing={6}>
                    <div>
                      <Typography.H1>Heading 1 - The quick brown fox</Typography.H1>
                      <Typography.Caption>H1 • 4xl/5xl • Bold</Typography.Caption>
                    </div>
                    
                    <div>
                      <Typography.H2>Heading 2 - The quick brown fox</Typography.H2>
                      <Typography.Caption>H2 • 3xl/4xl • Semibold</Typography.Caption>
                    </div>
                    
                    <div>
                      <Typography.H3>Heading 3 - The quick brown fox</Typography.H3>
                      <Typography.Caption>H3 • 2xl/3xl • Semibold</Typography.Caption>
                    </div>
                    
                    <div>
                      <Typography.H4>Heading 4 - The quick brown fox</Typography.H4>
                      <Typography.Caption>H4 • xl/2xl • Medium</Typography.Caption>
                    </div>
                    
                    <div>
                      <Typography.Body>
                        Body text - The quick brown fox jumps over the lazy dog. This is regular body text used for most content.
                      </Typography.Body>
                      <Typography.Caption>Body • Base • Regular</Typography.Caption>
                    </div>
                    
                    <div>
                      <Typography.Body variant="large">
                        Large body text - The quick brown fox jumps over the lazy dog.
                      </Typography.Body>
                      <Typography.Caption>Body Large • lg • Regular</Typography.Caption>
                    </div>
                    
                    <div>
                      <Typography.Body variant="small">
                        Small body text - The quick brown fox jumps over the lazy dog.
                      </Typography.Body>
                      <Typography.Caption>Body Small • sm • Regular</Typography.Caption>
                    </div>
                    
                    <div>
                      <Typography.Body variant="muted">
                        Muted text - The quick brown fox jumps over the lazy dog.
                      </Typography.Body>
                      <Typography.Caption>Body Muted • sm • Regular • Gray-500</Typography.Caption>
                    </div>
                    
                    <div>
                      <Typography.GradientText>
                        Gradient text - The quick brown fox jumps over the lazy dog.
                      </Typography.GradientText>
                      <Typography.Caption>Gradient Text • Semibold • Primary Gradient</Typography.Caption>
                    </div>
                  </Layout.Stack>
                </Card.Content>
              </Card.Root>
            </section>

            {/* Buttons */}
            <section>
              <Typography.H2 className="mb-6">Buttons</Typography.H2>
              
              <Card.Root>
                <Card.Content>
                  <Layout.Stack spacing={6}>
                    {/* Button Variants */}
                    <div>
                      <Typography.H4 className="mb-4">Variants</Typography.H4>
                      <Layout.Stack direction="horizontal" spacing={4}>
                        <Button.Root variant="primary">Primary</Button.Root>
                        <Button.Root variant="secondary">Secondary</Button.Root>
                        <Button.Root variant="ghost">Ghost</Button.Root>
                        <Button.Root variant="outline">Outline</Button.Root>
                        <Button.Root variant="danger">Danger</Button.Root>
                      </Layout.Stack>
                    </div>

                    {/* Button Sizes */}
                    <div>
                      <Typography.H4 className="mb-4">Sizes</Typography.H4>
                      <Layout.Stack direction="horizontal" spacing={4}>
                        <Button.Root size="sm">Small</Button.Root>
                        <Button.Root size="md">Medium</Button.Root>
                        <Button.Root size="lg">Large</Button.Root>
                      </Layout.Stack>
                    </div>

                    {/* Button States */}
                    <div>
                      <Typography.H4 className="mb-4">States</Typography.H4>
                      <Layout.Stack direction="horizontal" spacing={4}>
                        <Button.Root>Normal</Button.Root>
                        <Button.Root loading>Loading</Button.Root>
                        <Button.Root disabled>Disabled</Button.Root>
                      </Layout.Stack>
                    </div>
                  </Layout.Stack>
                </Card.Content>
              </Card.Root>
            </section>

            {/* Cards */}
            <section>
              <Typography.H2 className="mb-6">Cards</Typography.H2>
              
              <Layout.Grid cols={3} gap={6}>
                <Card.Root variant="default">
                  <Card.Header>
                    <Typography.H4>Default Card</Typography.H4>
                  </Card.Header>
                  <Card.Content>
                    <Typography.Body>
                      This is a default card with standard styling and shadow.
                    </Typography.Body>
                  </Card.Content>
                  <Card.Footer>
                    <Button.Root size="sm">Action</Button.Root>
                  </Card.Footer>
                </Card.Root>

                <Card.Root variant="elevated">
                  <Card.Header>
                    <Typography.H4>Elevated Card</Typography.H4>
                  </Card.Header>
                  <Card.Content>
                    <Typography.Body>
                      This is an elevated card with enhanced shadow for emphasis.
                    </Typography.Body>
                  </Card.Content>
                  <Card.Footer>
                    <Button.Root size="sm">Action</Button.Root>
                  </Card.Footer>
                </Card.Root>

                <Card.Root variant="glass">
                  <Card.Header>
                    <Typography.H4>Glass Card</Typography.H4>
                  </Card.Header>
                  <Card.Content>
                    <Typography.Body>
                      This is a glass morphism card with backdrop blur effect.
                    </Typography.Body>
                  </Card.Content>
                  <Card.Footer>
                    <Button.Root size="sm">Action</Button.Root>
                  </Card.Footer>
                </Card.Root>
              </Layout.Grid>
            </section>

            {/* Inputs */}
            <section>
              <Typography.H2 className="mb-6">Inputs</Typography.H2>
              
              <Card.Root>
                <Card.Content>
                  <Layout.Stack spacing={4}>
                    <div>
                      <Typography.H4 className="mb-2">Text Input</Typography.H4>
                      <Input.Root placeholder="Enter your text here..." />
                    </div>
                    
                    <div>
                      <Typography.H4 className="mb-2">Error State</Typography.H4>
                      <Input.Root placeholder="This has an error..." error />
                    </div>
                    
                    <div>
                      <Typography.H4 className="mb-2">Textarea</Typography.H4>
                      <Input.Textarea placeholder="Enter your message here..." rows={4} />
                    </div>
                  </Layout.Stack>
                </Card.Content>
              </Card.Root>
            </section>

            {/* Badges */}
            <section>
              <Typography.H2 className="mb-6">Badges</Typography.H2>
              
              <Card.Root>
                <Card.Content>
                  <Layout.Stack spacing={4}>
                    <div>
                      <Typography.H4 className="mb-4">Variants</Typography.H4>
                      <Layout.Stack direction="horizontal" spacing={2}>
                        <Badge.Root variant="default">Default</Badge.Root>
                        <Badge.Root variant="primary">Primary</Badge.Root>
                        <Badge.Root variant="secondary">Secondary</Badge.Root>
                        <Badge.Root variant="success">Success</Badge.Root>
                        <Badge.Root variant="warning">Warning</Badge.Root>
                        <Badge.Root variant="error">Error</Badge.Root>
                      </Layout.Stack>
                    </div>

                    <div>
                      <Typography.H4 className="mb-4">Mood Badges</Typography.H4>
                      <Layout.Stack direction="horizontal" spacing={2}>
                        {Object.keys(designTokens.colors.mood).slice(0, 6).map((mood) => (
                          <Badge.Root key={mood} variant="mood" mood={mood}>
                            {mood}
                          </Badge.Root>
                        ))}
                      </Layout.Stack>
                    </div>
                  </Layout.Stack>
                </Card.Content>
              </Card.Root>
            </section>

            {/* Loading States */}
            <section>
              <Typography.H2 className="mb-6">Loading States</Typography.H2>
              
              <Card.Root>
                <Card.Content>
                  <Layout.Stack spacing={6}>
                    <div>
                      <Typography.H4 className="mb-4">Spinners</Typography.H4>
                      <Layout.Stack direction="horizontal" spacing={4}>
                        <div className="text-center">
                          <Loading.Spinner size="sm" />
                          <Typography.Caption className="block mt-2">Small</Typography.Caption>
                        </div>
                        <div className="text-center">
                          <Loading.Spinner size="md" />
                          <Typography.Caption className="block mt-2">Medium</Typography.Caption>
                        </div>
                        <div className="text-center">
                          <Loading.Spinner size="lg" />
                          <Typography.Caption className="block mt-2">Large</Typography.Caption>
                        </div>
                      </Layout.Stack>
                    </div>

                    <div>
                      <Typography.H4 className="mb-4">Dots</Typography.H4>
                      <Loading.Dots />
                    </div>

                    <div>
                      <Typography.H4 className="mb-4">Skeleton</Typography.H4>
                      <Layout.Stack spacing={2}>
                        <Loading.Skeleton className="h-4 w-3/4" />
                        <Loading.Skeleton className="h-4 w-1/2" />
                        <Loading.Skeleton className="h-4 w-2/3" />
                      </Layout.Stack>
                    </div>
                  </Layout.Stack>
                </Card.Content>
              </Card.Root>
            </section>

            {/* Status Indicators */}
            <section>
              <Typography.H2 className="mb-6">Status Indicators</Typography.H2>
              
              <Card.Root>
                <Card.Content>
                  <Layout.Stack direction="horizontal" spacing={6}>
                    <div className="flex items-center space-x-2">
                      <Status.Indicator status="online" />
                      <Typography.Body>Online</Typography.Body>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Status.Indicator status="away" />
                      <Typography.Body>Away</Typography.Body>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Status.Indicator status="busy" />
                      <Typography.Body>Busy</Typography.Body>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Status.Indicator status="offline" />
                      <Typography.Body>Offline</Typography.Body>
                    </div>
                  </Layout.Stack>
                </Card.Content>
              </Card.Root>
            </section>
          </div>
        </Layout.Container>
      </div>
    </div>
  );
}