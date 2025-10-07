'use client';

import * as React from 'react';
import { Tabs, Tab, Box, Typography } from '@mui/material';
import type { ProgressCategory } from '@/types/program-progress';
import { getCategoryColor } from '@/lib/utils/progress';

interface ProgressTabsProps {
  selectedCategory: ProgressCategory;
  onCategoryChange: (category: ProgressCategory) => void;
  categories: Array<{
    category: ProgressCategory;
    label: string;
    overallPercent: number;
  }>;
}

const CATEGORY_ORDER: ProgressCategory[] = ['MAJOR', 'MINOR', 'GE', 'RELIGION', 'ELECTIVES'];

export default function ProgressTabs({
  selectedCategory,
  onCategoryChange,
  categories
}: ProgressTabsProps) {
  const sortedCategories = React.useMemo(() => {
    return CATEGORY_ORDER.map(cat => categories.find(c => c.category === cat))
      .filter(Boolean) as typeof categories;
  }, [categories]);

  const handleChange = (_event: React.SyntheticEvent, newValue: ProgressCategory) => {
    onCategoryChange(newValue);
  };

  return (
    <Box sx={{
      mb: 1.5
    }}>
      <Tabs
        value={selectedCategory}
        onChange={handleChange}
        variant="fullWidth"
        aria-label="program progress categories"
        TabIndicatorProps={{ style: { display: 'none' } }}
        sx={{
          minHeight: '50px',
          '& .MuiTabs-flexContainer': {
            gap: 0.5,
          },
        }}
      >
        {sortedCategories.map((cat) => {
          const isSelected = selectedCategory === cat.category;
          const catColor = getCategoryColor(cat.category);

          return (
            <Tab
              key={cat.category}
              value={cat.category}
              label={
                <Box sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  gap: 0.5,
                  width: '100%',
                }}>
                  <span
                    className="font-body-semi"
                    style={{
                      fontSize: '0.75rem',
                      lineHeight: 1.2,
                      textAlign: 'center',
                    }}
                  >
                    {cat.label}
                  </span>
                  {/* Progress bar with percentage inside */}
                  <Box
                    sx={{
                      position: 'relative',
                      width: '100%',
                      height: '18px',
                      borderRadius: '3px',
                      backgroundColor: 'var(--muted)',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Filled portion */}
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${cat.overallPercent}%`,
                        backgroundColor: catColor,
                        transition: 'width 0.3s ease-in-out',
                      }}
                    />
                    {/* Percentage text */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          color: '#fff',
                          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                          zIndex: 1,
                        }}
                      >
                        {cat.overallPercent}%
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              }
              sx={{
                textTransform: 'none',
                minHeight: '50px',
                minWidth: '70px',
                px: 0.75,
                py: 0.75,
                borderRadius: '6px',
                backgroundColor: isSelected
                  ? `${catColor}15`
                  : `${catColor}08`,
                color: isSelected ? catColor : 'var(--muted-foreground)',
                fontFamily: 'Inter, sans-serif',
                border: isSelected ? `2px solid ${catColor}40` : '1px solid var(--border)',
                transition: 'all 0.2s ease-in-out',
                '&.Mui-selected': {
                  color: catColor,
                  fontWeight: 600,
                },
                '&:hover': {
                  backgroundColor: `${catColor}20`,
                  borderColor: `${catColor}60`,
                },
                '&:focus-visible': {
                  outline: `2px solid ${catColor}`,
                  outlineOffset: '2px',
                  borderRadius: '6px',
                },
              }}
            />
          );
        })}
      </Tabs>
    </Box>
  );
}
