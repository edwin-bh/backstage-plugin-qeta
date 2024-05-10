import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Grid,
  MenuItem,
  Radio,
  RadioGroup,
  TextField,
} from '@material-ui/core';
import { useQetaApi, useStyles } from '../../utils/hooks';
import { Autocomplete } from '@material-ui/lab';
import { Entity, stringifyEntityRef } from '@backstage/catalog-model';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { formatDate, getEntityTitle } from '../../utils/utils';

const radioSelect = (value: string, label: string) => {
  return (
    <FormControlLabel
      value={value}
      control={<Radio size="small" />}
      label={label}
    />
  );
};

export const filterKeys = [
  'orderBy',
  'order',
  'noAnswers',
  'noCorrectAnswer',
  'noVotes',
  'entity',
  'tags',
  'dateRange',
] as const;
export type FilterKey = (typeof filterKeys)[number];

export type Filters = {
  order: string;
  orderBy: string;
  noAnswers: string;
  noCorrectAnswer: string;
  noVotes: string;
  searchQuery: string;
  entity: string;
  tags: string[];
  dateRange?: string | 'Select';
  // fromDate?: string | '';
  // toDate?: string;
};

export interface FilterPanelProps {
  onChange: (key: FilterKey, value: string | string[]) => void;
  filters: Filters;
  showEntityFilter?: boolean;
  showTagFilter?: boolean;
}

export const FilterPanel = (props: FilterPanelProps) => {
  const {
    onChange,
    filters,
    showEntityFilter = true,
    showTagFilter = true,
  } = props;
  const styles = useStyles();
  const { value: refs } = useQetaApi(api => api.getEntities(), []);
  const { value: tags } = useQetaApi(api => api.getTags(), []);
  const catalogApi = useApi(catalogApiRef);
  const [availableEntities, setAvailableEntities] = React.useState<
    Entity[] | null
  >(null);
  const [selectedEntity, setSelectedEntity] = React.useState<
    Entity | undefined
  >(undefined);
  const [availableTags, setAvailableTags] = React.useState<string[] | null>(
    null,
  );

  const [showDateRange, setShowDateRange] = useState(false);
  const [dateRange, setDateRange] = useState('Select');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [fromDateHasError, setFromDateHasError] = useState(true);
  const [toDateHasError, setToDateHasError] = useState(true);
  const [fromDateHelperText, setFromDateHelperText] =
    useState('Select From Date');
  const [toDateHelperText, setToDateHelperText] = useState('Select To Date');

  useEffect(() => {
    if ((tags && tags.length > 0) || filters.tags) {
      const ts = (tags ?? []).map(t => t.tag);
      if (filters.tags) {
        ts.push(...filters.tags);
      }
      setAvailableTags([...new Set(ts)]);
    }
  }, [tags, filters.tags]);

  useEffect(() => {
    if (
      (filters.entity || (refs && refs?.length > 0)) &&
      !Array.isArray(filters.entity)
    ) {
      catalogApi
        .getEntitiesByRefs({
          entityRefs: [...(refs ?? []).map(e => e.entityRef), filters.entity],
          fields: [
            'kind',
            'metadata.name',
            'metadata.namespace',
            'metadata.title',
          ],
        })
        .then(resp => {
          const filtered = resp.items.filter(i => i !== undefined) as Entity[];
          setAvailableEntities(filtered);
        });
    }
  }, [filters.entity, catalogApi, refs]);

  useEffect(() => {
    if (filters.entity && availableEntities) {
      const value = availableEntities.find(
        e => stringifyEntityRef(e) === filters.entity,
      );
      setSelectedEntity(value);
      if (!value) {
        onChange('entity', '');
      }
    } else {
      setSelectedEntity(undefined);
    }
  }, [availableEntities, filters.entity, onChange]);

  useEffect(() => {
    const dateRangeForFilters = filters.dateRange || 'Select';
    setDateRange(dateRangeForFilters);
    if (!['7-days', '30-days', 'Select'].includes(dateRangeForFilters)) {
      setShowDateRange(true);
      setDateRange('customDate');

      setFromDate(dateRangeForFilters.split('--')[0] || '');
      setToDate(dateRangeForFilters.split('--')[1] || '');
      setFromDateHasError(false);
      setToDateHasError(false);
      setFromDateHelperText('');
      setToDateHelperText('');
    }
  }, [filters.dateRange]);

  const handleChange = useCallback(
    (event: {
      target: {
        value: string | string[];
        type?: string;
        name: string;
        checked?: boolean;
      };
    }) => {
      let value = event.target.value;
      if (event.target.type === 'checkbox') {
        value = event.target.checked ? 'true' : 'false';
      }
      onChange(event.target.name as FilterKey, value);
    },
    [onChange],
  );

  useEffect(() => {
    if (fromDate && toDate) {
      setToDateHasError(true);
      setToDateHelperText('Select To Date');
      const startDate = new Date(fromDate || '');
      const endDate = new Date(toDate || '');
      if (startDate <= endDate) {
        setToDateHasError(false);
        setToDateHelperText('');

        handleChange({
          target: {
            name: 'dateRange',
            value: `${fromDate}--${toDate}`,
          },
        });
      } else {
        setToDateHasError(true);
        setToDateHelperText('To Date should be greater than the From Date');
      }
    }
  }, [fromDate, toDate, handleChange]);

  // const validateDate = (value: string) => {
  //   setToDateHasError(true);
  //   setToDateHelperText('Select To Date');
  //   if (value) {
  //     const startDate = new Date(filters.fromDate || '');
  //     const endDate = new Date(value || '');
  //     if (startDate <= endDate) {
  //       setToDateHasError(false);
  //       setToDateHelperText('');

  //       handleChange({
  //         target: {
  //           name: 'dateRange',
  //           value: `${filters.fromDate}--${value}`,
  //         },
  //       });
  //     } else {
  //       setToDateHasError(true);
  //       setToDateHelperText('To Date should be greater than the From Date');
  //     }
  //   }
  // };

  const localDate = formatDate(new Date());

  return (
    <Box className={`qetaFilterPanel ${styles.filterPanel}`}>
      <Grid container spacing={4}>
        <Grid item md={3} xs={4}>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  name="noAnswers"
                  onChange={handleChange}
                  checked={filters.noAnswers === 'true'}
                />
              }
              label="No answers"
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  name="noCorrectAnswer"
                  checked={filters.noCorrectAnswer === 'true'}
                  onChange={handleChange}
                />
              }
              label="No correct answers"
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  name="noVotes"
                  checked={filters.noVotes === 'true'}
                  onChange={handleChange}
                />
              }
              label="No votes"
            />
          </FormGroup>
        </Grid>
        <Grid item md={2} xs={4}>
          <FormControl>
            <FormLabel id="qeta-filter-order-by">Order by</FormLabel>
            <RadioGroup
              aria-labelledby="qeta-filter-order-by"
              name="orderBy"
              value={filters.orderBy}
              onChange={handleChange}
            >
              {radioSelect('created', 'Created')}
              {radioSelect('views', 'Views')}
              {radioSelect('score', 'Score')}
              {radioSelect('answersCount', 'Answers')}
            </RadioGroup>
          </FormControl>
        </Grid>
        <Grid item md={2} xs={4}>
          <FormControl>
            <FormLabel id="qeta-filter-order">Order</FormLabel>
            <RadioGroup
              aria-labelledby="qeta-filter-order"
              name="order"
              value={filters.order}
              onChange={handleChange}
            >
              {radioSelect('desc', 'Descending')}
              {radioSelect('asc', 'Ascending')}
            </RadioGroup>
          </FormControl>
        </Grid>
        {((availableEntities && availableEntities.length > 0) ||
          (availableTags && availableTags.length > 0)) &&
          (showEntityFilter || showTagFilter) && (
            <Grid item md={4} xs={8}>
              <FormLabel id="qeta-filter-entity">Filters</FormLabel>
              {showEntityFilter &&
                availableEntities &&
                availableEntities.length > 0 &&
                (!filters.entity || selectedEntity) && (
                  <Autocomplete
                    multiple={false}
                    className="qetaEntityFilter"
                    value={selectedEntity ?? null}
                    id="entities-select"
                    options={availableEntities}
                    getOptionLabel={getEntityTitle}
                    getOptionSelected={(o, v) => {
                      if (!o || !v) {
                        return false;
                      }
                      return stringifyEntityRef(o) === stringifyEntityRef(v);
                    }}
                    onChange={(_e, newValue) => {
                      handleChange({
                        target: {
                          name: 'entity',
                          value: newValue ? stringifyEntityRef(newValue) : '',
                        },
                      });
                    }}
                    renderInput={params => (
                      <TextField
                        {...params}
                        variant="outlined"
                        margin="normal"
                        label="Entity"
                        placeholder="Type or select entity"
                      />
                    )}
                  />
                )}
              {showTagFilter && availableTags && availableTags.length > 0 && (
                <Autocomplete
                  multiple
                  className="qetaTagFilter"
                  value={filters.tags}
                  id="tags-select"
                  options={availableTags}
                  onChange={(_e, newValue) => {
                    handleChange({
                      target: {
                        name: 'tags',
                        value: newValue,
                      },
                    });
                  }}
                  renderInput={params => (
                    <TextField
                      {...params}
                      variant="outlined"
                      margin="normal"
                      label="Tag"
                      placeholder="Type or select tag"
                    />
                  )}
                />
              )}
            </Grid>
          )}
      </Grid>
      <Divider />
      <TextField
        id="outlined-select-currency"
        select
        label="Date Range"
        className={styles.dateFilter}
        value={dateRange}
        onChange={_e => {
          setDateRange(_e.target.value);
          setShowDateRange(false);
          if (_e.target.value === 'customDate') {
            setFromDate('');
            setToDate('');
            setFromDateHasError(true);
            setFromDateHelperText('Select From Date');
            setToDateHasError(true);
            setToDateHelperText('Select To Date');

            setShowDateRange(true);
          } else {
            handleChange({
              target: {
                name: 'dateRange',
                value: _e.target.value,
              },
            });
          }
        }}
        variant="outlined"
        size="small"
        defaultValue="None"
      >
        <MenuItem aria-label="Select" value="Select">
          Select
        </MenuItem>
        <MenuItem value="7-days">Last 7 Days</MenuItem>
        <MenuItem value="30-days">Last 30 Days</MenuItem>
        <MenuItem value="customDate">Custom Date</MenuItem>
      </TextField>
      {showDateRange && (
        <>
          <TextField
            variant="outlined"
            label="From Date"
            id="From-date"
            type="date"
            value={fromDate}
            className={styles.dateFilter}
            size="small"
            InputLabelProps={{ shrink: true }}
            error={fromDateHasError}
            helperText={fromDateHelperText}
            onChange={_e => {
              setFromDate(_e.target.value);
              // filters.fromDate = _e.target.value;
              setFromDateHasError(true);
              setFromDateHelperText('Select From Date');
              if (_e.target.value) {
                setFromDateHasError(false);
                setFromDateHelperText('');
                // if (toDate) {
                //   validateDate(toDate);
                // }
              }
            }}
            inputProps={{
              max: localDate,
            }}
          />
          <TextField
            variant="outlined"
            label="To Date"
            id="to-date"
            type="date"
            value={toDate}
            className={styles.dateFilter}
            size="small"
            InputLabelProps={{ shrink: true }}
            error={toDateHasError}
            helperText={toDateHelperText}
            onChange={_e => {
              setToDate(_e.target.value);
              // validateDate(_e.target.value);
            }}
            inputProps={{
              min: fromDate || localDate,
              max: localDate,
            }}
          />
        </>
      )}
    </Box>
  );
};
