import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as d3 from 'd3';
import { HttpClient } from '@angular/common/http';
import { MatSidenav } from '@angular/material/sidenav';

interface EuropeNode {
  name: string;
  value?: number;
  children?: EuropeNode[];
  population?: number;
  wikipedia?: string;
  flag?: string;
  land_area_km2?: number;
}

@Component({
  selector: 'app-circle-packing',
  templateUrl: './circle-packing.component.html',
  styleUrls: ['./circle-packing.component.scss']
})
export class CirclePackingComponent implements OnInit {

  @ViewChild('chart') private chartContainer!: ElementRef;
  @ViewChild('drawer') private drawer!: MatSidenav;
  isPopulation: boolean = true; // Default to population
  selectedCountry: any = null;

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.loadDataAndCreateChart();
  }

  private loadDataAndCreateChart(): void {
    this.http.get<any>('assets/data/europe.json').subscribe(json => {
      const transformed = this.transformData(json);
      this.createCirclePacking(transformed);
    });
  }

  private transformData(json: any) {
    const selectedMetric = this.isPopulation ? 'population' : 'land_area_km2';
    return {
      name: 'Europe',
      children: Object.entries(json.Europe).map(([region, countries]: any) => ({
        name: region,
        children: countries.map((country: any) => ({
          name: country.country,
          population: country.population,
          land_area_km2: country.land_area_km2,
          value: country[selectedMetric], // Use the selected metric for the value
          ...country
        }))
      }))
    };
  }

  private createCirclePacking(data: any): void {
    const element = this.chartContainer.nativeElement;
    const width = 932;
    const height = width;

    // Clear any existing SVG
    d3.select(element).select('svg').remove();

    const root = d3
      .hierarchy(data)
      .sum((d: any) => d.value || 0)  // Ensure sum is 0 if value is undefined
      .sort((a, b) => b.value! - a.value!);

    const packLayout = d3.pack<EuropeNode>().size([width, height]).padding(3);
    const nodes = packLayout(root).descendants();

    const svg = d3
      .select(element)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('font', '10px sans-serif');

    //Added color for background circle
    svg.append('circle')
      .attr('r', 466)
      .attr('cx', width / 2)
      .attr('cy', height / 2)
      .attr('fill', '#d43d8e')
      .attr('stroke', 'none');

    //Color scale based on depth
    const color = d3.scaleLinear<string>()
      .domain([0, 5]) // Adjust based on max depth
      .range(["#fde0dd", "#c51b8a"])
      .interpolate(d3.interpolateLab);

    const node = svg
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('transform', (d: any) => `translate(${d.x},${d.y})`)
      .on('click', (event, d) => this.openSideDrawer(d.data));  // Added click event for the circle

    node
      .append('circle')
      .attr('r', (d: any) => d.r)
      .attr('fill', (d: any) => color(d.depth))
      .attr('stroke', 'none'); // Removed stroke for cleaner look

    const text = node
      .filter((d: any) => !d.children)
      .append('text')
      .attr('dy', '0.3em')
      .style('text-anchor', 'middle')
      .style('pointer-events', 'none');

    text.each((d: any, i: number, nodes: any) => {
      const group = d3.select(nodes[i]);
      const radius = d.r;
      const maxLineLength = Math.floor(radius / 4);
      const nameLines = this.wrapText(d.data.name || '', maxLineLength);

      nameLines.forEach((line, index) => {
        group
          .append('tspan')
          .attr('x', 0)
          .attr('dy', index === 0 ? '-0.5em' : '1.0em')
          .style('font-weight', index === 0 ? 'bold' : 'normal')
          .style('font-size', `${Math.min(radius / 4, 14)}px`)
          .text(line);
      });

      // Add population/area as final line
      const value = this.isPopulation ? d.data.population : d.data.land_area_km2;
      if (value && radius > 20) {
        group
          .append('tspan')
          .attr('x', 0)
          .attr('dy', '1.0em')
          .style('font-size', `${Math.min(radius / 5, 12)}px`)
          .text(value);
      }
    });


  }


  openSideDrawer(country: any): void {
    this.selectedCountry = country;
    this.drawer.open();
  }

  updateMetric() {
    this.loadDataAndCreateChart();
  }

  //Word wrapper method if the country name is long
  private wrapText(text: string, maxCharsPerLine: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';

    for (let word of words) {
      if ((line + word).length <= maxCharsPerLine) {
        line += (line ? ' ' : '') + word;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);

    return lines;
  }
}
