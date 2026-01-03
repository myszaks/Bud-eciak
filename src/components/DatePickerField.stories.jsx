import React from 'react';
import DatePickerField from './DatePickerField';

export default {
  title: 'Form/DatePickerField',
  component: DatePickerField,
};

const Template = (args) => <DatePickerField {...args} />;

export const Default = Template.bind({});
Default.args = {
  value: null,
  onChange: (v) => console.log('date changed', v),
};
